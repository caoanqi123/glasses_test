package cn.bupt.ibrain_glasses.glasses.utils;

import lombok.Data;
import org.springframework.http.ResponseEntity;

@Data
public class ApiResponse {

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
        return ResponseEntity.status(status).body(new ApiResponse(message));
    }

    public static ResponseEntity<ApiResponse> createResponse(int status, String message, Object data) {
        return ResponseEntity.status(status).body(new ApiResponse(message, data));
    }


}
