package com.example.backend.contract;

import com.example.backend.domain.Contract;
import com.example.backend.domain.ContractRepository;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.exception.AppException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContractService {

    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("application/pdf", "image/jpeg", "image/png");

    private final ContractRepository contractRepository;
    private final UsersRepository usersRepository;
    private final ContractExtractionRunner extractionRunner;
    private final ObjectMapper objectMapper;

    @Transactional
    public ContractDTO.ContractSummary upload(UUID userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Vui lòng chọn một file để tải lên.");
        }
        String contentType = file.getContentType();
        if (file.getSize() > MAX_FILE_BYTES || contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                    "File vượt quá 10MB hoặc không đúng định dạng hỗ trợ (PDF, JPG, PNG).");
        }

        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Không đọc được file đã tải lên.");
        }

        Contract contract = new Contract();
        contract.setUser(user);
        contract.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "contract");
        contract.setFileSizeBytes(file.getSize());
        contract.setContentType(contentType);
        contract.setFileData(bytes);
        contract.setExtractionStatus("PENDING");
        contract = contractRepository.save(contract);

        log.info("Contract uploaded — user={} contractId={} fileName={}", userId, contract.getId(), contract.getFileName());
        // The async runner reads this row on its own connection — it must not
        // start before this transaction commits, or it may not see the row yet.
        UUID contractId = contract.getId();
        runAfterCommit(() -> extractionRunner.run(contractId, bytes, contentType));
        return toSummary(contract);
    }

    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    @Transactional(readOnly = true)
    public List<ContractDTO.ContractSummary> list(UUID userId, String search) {
        List<Contract> contracts = (search == null || search.isBlank())
                ? contractRepository.findByUser_IdOrderByUploadedAtDesc(userId)
                : contractRepository.findByUser_IdAndFileNameContainingIgnoreCaseOrderByUploadedAtDesc(userId, search);
        return contracts.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public ContractDTO.ContractDetail get(UUID contractId, UUID userId) {
        Contract contract = requireOwned(contractId, userId);
        return ContractDTO.ContractDetail.builder()
                .id(contract.getId())
                .fileName(contract.getFileName())
                .fileSizeBytes(contract.getFileSizeBytes())
                .uploadedAt(contract.getUploadedAt())
                .extractionStatus(contract.getExtractionStatus())
                .extractedData(parseExtractedData(contract.getExtractedData()))
                .build();
    }

    /** Raw file bytes + content type, for the authenticated file-download endpoint. */
    @Transactional(readOnly = true)
    public Contract getFileForDownload(UUID contractId, UUID userId) {
        return requireOwned(contractId, userId);
    }

    /**
     * Renames the library entry only — display name, not the underlying file
     * bytes. Does not touch extracted_data or any assessment_contract_links
     * (a rename never affects verification status/scoring).
     */
    @Transactional
    public ContractDTO.ContractSummary rename(UUID contractId, UUID userId, String newFileName) {
        if (newFileName == null || newFileName.isBlank()) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Tên hợp đồng không được để trống.");
        }
        if (newFileName.length() > 255) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Tên hợp đồng tối đa 255 ký tự.");
        }
        Contract contract = requireOwned(contractId, userId);
        contract.setFileName(newFileName.trim());
        contract = contractRepository.save(contract);
        return toSummary(contract);
    }

    @Transactional
    public void delete(UUID contractId, UUID userId) {
        Contract contract = requireOwned(contractId, userId);
        contractRepository.delete(contract);
    }

    Contract requireOwned(UUID contractId, UUID userId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.CONTRACT_NOT_FOUND));
        if (!contract.getUser().getId().equals(userId)) {
            throw new AppException(AppException.ErrorCode.CONTRACT_NOT_FOUND);
        }
        return contract;
    }

    private ContractDTO.ContractSummary toSummary(Contract c) {
        return ContractDTO.ContractSummary.builder()
                .id(c.getId())
                .fileName(c.getFileName())
                .uploadedAt(c.getUploadedAt())
                .extractionStatus(c.getExtractionStatus())
                .extractedData(parseExtractedData(c.getExtractedData()))
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, ContractDTO.ExtractedField> parseExtractedData(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            Map<String, Map<String, Object>> raw = objectMapper.readValue(json, Map.class);
            return raw.entrySet().stream().collect(java.util.stream.Collectors.toMap(
                    Map.Entry::getKey,
                    e -> ContractDTO.ExtractedField.builder()
                            .value(e.getValue().get("value"))
                            .confidence(e.getValue().get("confidence") == null ? null
                                    : ((Number) e.getValue().get("confidence")).doubleValue())
                            .sourceText((String) e.getValue().get("sourceText"))
                            .build()));
        } catch (Exception e) {
            log.warn("Failed to parse extracted_data JSON: {}", e.getMessage());
            return Map.of();
        }
    }

}
