package com.leozara.cashwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CashWiseApplication {

    public static void main(String[] args) {
        SpringApplication.run(CashWiseApplication.class, args);
    }
}