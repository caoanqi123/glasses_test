package cn.bupt.ibrain_glasses.glasses.utils;

import lombok.Data;
import org.springframework.http.ResponseEntity;

@Data
public class ApiResponse {
    private boolean success;
    private String message;
    private Object data;

    public ApiResponse(String message) {
        this.message = message;
        this.data = null;
    }

    public ApiResponse(String message, Object data) {
        this.message = message;
        this.data = data;
    }

    public static ResponseEntity<ApiResponse> createResponse(int status, String message) {
        ApiResponse resp = new ApiResponse(message);
        resp.setSuccess(status >= 200 && status < 300);
        return ResponseEntity.status(status).body(resp);
    }

    public static ResponseEntity<ApiResponse> createResponse(int status, String message, Object data) {
        ApiResponse resp = new ApiResponse(message, data);
        resp.setSuccess(status >= 200 && status < 300);
        return ResponseEntity.status(status).body(resp);
    }
}
