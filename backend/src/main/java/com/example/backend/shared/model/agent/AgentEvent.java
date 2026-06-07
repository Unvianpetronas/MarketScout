package com.example.backend.shared.model.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentEvent {
    private String agent;   // manager | crawler | scoring | safety | result
    private String status;  // thinking | done | error
    private String message;
    private Object data;

    public static AgentEvent thinking(String agent, String message) {
        return AgentEvent.builder().agent(agent).status("thinking").message(message).build();
    }

    public static AgentEvent done(String agent, String message, Object data) {
        return AgentEvent.builder().agent(agent).status("done").message(message).data(data).build();
    }

    public static AgentEvent error(String agent, String message) {
        return AgentEvent.builder().agent(agent).status("error").message(message).build();
    }
}
