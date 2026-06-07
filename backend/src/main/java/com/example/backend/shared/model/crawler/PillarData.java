package com.example.backend.shared.model.crawler;

import com.example.backend.shared.model.input.CompanyInput;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PillarData {

    public enum DataState { FOUND, NOT_FOUND, SKIP }

    private DataState state;
    private String companyName;
    private String rawText;
    private String errorMsg;
    private String dataSource;
    private LocalDateTime fetchedAt;

    public boolean isFound() {
        return state == DataState.FOUND;
    }

    public static PillarData skip(CompanyInput input, String reason) {
        return PillarData.builder()
            .state(DataState.SKIP)
            .companyName(input.getName())
            .errorMsg(reason)
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    public static PillarData notFound(CompanyInput input, String reason) {
        return PillarData.builder()
            .state(DataState.NOT_FOUND)
            .companyName(input.getName())
            .errorMsg(reason)
            .fetchedAt(LocalDateTime.now())
            .build();
    }
}
