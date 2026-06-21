package com.example.backend.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResolutionResult {
    private String normalizedName;      // tên đã chuẩn hóa từ input user
    private String suggestedFullName;   // tên đầy đủ với hậu tố pháp lý (nếu Gemini biết)
    private String countryIso2;         // quốc gia gợi ý ISO2, null nếu không rõ
    private boolean ambiguous;          // true → cần hỏi lại user
    private boolean vietnam;            // true → là công ty VN
    private List<String> alternatives;  // gợi ý khi ambiguous=true
}
