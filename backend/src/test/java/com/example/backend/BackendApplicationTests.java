package com.example.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Integration test — requires live SQL Server + Redis. Run manually with full infrastructure.")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
