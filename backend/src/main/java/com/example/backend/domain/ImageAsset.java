package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "image_assets")
public class ImageAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Size(max = 500)
    @NotNull
    @Column(name = "minio_key", nullable = false, length = 500)
    private String minioKey;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'uploaded'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "file_size")
    private Long fileSize;
}