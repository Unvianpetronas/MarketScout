package com.example.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "image_assets")
public class ImageAsset {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Size(max = 500)
    @NotNull
    @Nationalized
    @Column(name = "minio_key", nullable = false, length = 500)
    private String minioKey;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'uploaded'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "file_size")
    private Long fileSize;


}