package com.example.backend.shared.model.scoring;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Evidence {
    private String type;   // PASS | WARN | FAIL
    private String text;
    private String source;
    private String url;    // clickable link to the source record, when one is known
}
