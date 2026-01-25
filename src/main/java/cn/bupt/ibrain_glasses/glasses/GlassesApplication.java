package cn.bupt.ibrain_glasses.glasses;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan("cn.bupt.ibrain_glasses.glasses.mapper")
@SpringBootApplication
public class GlassesApplication {

    public static void main(String[] args) {
        SpringApplication.run(GlassesApplication.class, args);
    }

}
