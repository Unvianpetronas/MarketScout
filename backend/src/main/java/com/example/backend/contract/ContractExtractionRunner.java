package com.example.backend.contract;

import com.example.backend.domain.Contract;
import com.example.backend.domain.ContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Runs contract AI extraction off the request thread. Kept as its own bean
 * (rather than an @Async method on ContractService) because @Async only
 * works through a Spring proxy — calling it as `this.method()` from within
 * the same class silently runs synchronously instead of dispatching async.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractExtractionRunner {

    private final ContractRepository contractRepository;
    private final ContractExtractor contractExtractor;

    @Async
    public void run(UUID contractId, byte[] bytes, String contentType) {
        Contract contract = contractRepository.findById(contractId).orElse(null);
        if (contract == null) return;
        contract.setExtractionStatus("PROCESSING");
        contractRepository.save(contract);

        ContractExtractor.Result result = contractExtractor.extract(bytes, contentType);
        contract = contractRepository.findById(contractId).orElse(null);
        if (contract == null) return;
        if (result.success()) {
            contract.setExtractedData(result.extractedDataJson());
            contract.setExtractionStatus("COMPLETED");
        } else {
            contract.setExtractionStatus("FAILED");
        }
        contractRepository.save(contract);
        log.info("Contract extraction {} — contractId={}", contract.getExtractionStatus(), contractId);
    }
}
