
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcement_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `badge_style` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_style` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `announcement_categories_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_breaks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `attendance_id` bigint unsigned NOT NULL,
  `break_start` timestamp NOT NULL,
  `break_end` timestamp NULL DEFAULT NULL,
  `total_break_minutes` int DEFAULT NULL,
  `break_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Standard',
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_breaks_attendance_id_foreign` (`attendance_id`),
  CONSTRAINT `attendance_breaks_attendance_id_foreign` FOREIGN KEY (`attendance_id`) REFERENCES `attendances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77087 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `check_in_time` timestamp NULL DEFAULT NULL,
  `check_out_time` timestamp NULL DEFAULT NULL,
  `total_working_minutes` int DEFAULT NULL,
  `status` enum('Present','Absent','Late','Half Day') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Present',
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendances_user_id_date_unique` (`user_id`,`date`),
  CONSTRAINT `attendances_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1637 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_id` bigint unsigned DEFAULT NULL,
  `changes` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=686 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biometric_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `source_system` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_table` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_event_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` enum('in','out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `local_punch_time` timestamp NOT NULL,
  `source_timezone` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `utc_punch_time` timestamp NOT NULL,
  `mapping_status` enum('unmapped','mapped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unmapped',
  `processing_status` enum('pending','processed','error','ignored') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `duplicate_reference` bigint unsigned DEFAULT NULL,
  `error_reason` text COLLATE utf8mb4_unicode_ci,
  `received_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `biometric_events_source_unique` (`source_system`,`source_table`,`source_event_id`),
  KEY `biometric_events_duplicate_reference_foreign` (`duplicate_reference`),
  KEY `biometric_events_local_punch_time_index` (`local_punch_time`),
  KEY `biometric_events_user_id_local_punch_time_index` (`user_id`,`local_punch_time`),
  CONSTRAINT `biometric_events_duplicate_reference_foreign` FOREIGN KEY (`duplicate_reference`) REFERENCES `biometric_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `biometric_events_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=30578 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biometric_sync_states` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `source_system` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_table` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_successful_sync` timestamp NULL DEFAULT NULL,
  `last_attempted_sync` timestamp NULL DEFAULT NULL,
  `sync_status` enum('idle','running','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'idle',
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `biometric_sync_states_unique` (`source_system`,`source_table`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `birthday_wishes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `birthday_user_id` bigint unsigned NOT NULL,
  `sender_id` bigint unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `birthday_wishes_birthday_user_id_sender_id_unique` (`birthday_user_id`,`sender_id`),
  KEY `birthday_wishes_birthday_user_id_index` (`birthday_user_id`),
  KEY `birthday_wishes_sender_id_index` (`sender_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bug_id` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bugzilla_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `bugzilla_attachments_bug_id_index` (`bug_id`),
  CONSTRAINT `bugzilla_attachments_bug_id_foreign` FOREIGN KEY (`bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_bug_label` (
  `bug_id` bigint unsigned NOT NULL,
  `label_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`bug_id`,`label_id`),
  KEY `bugzilla_bug_label_label_id_foreign` (`label_id`),
  CONSTRAINT `bugzilla_bug_label_bug_id_foreign` FOREIGN KEY (`bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_bug_label_label_id_foreign` FOREIGN KEY (`label_id`) REFERENCES `bugzilla_labels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_bugs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bug_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bugzilla_project_id` bigint unsigned NOT NULL,
  `portal_project_id` bigint unsigned NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `component_id` bigint unsigned DEFAULT NULL,
  `reporter_id` bigint unsigned NOT NULL,
  `assignee_id` bigint unsigned DEFAULT NULL,
  `summary` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `steps_to_reproduce` text COLLATE utf8mb4_unicode_ci,
  `expected_result` text COLLATE utf8mb4_unicode_ci,
  `actual_result` text COLLATE utf8mb4_unicode_ci,
  `environment` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `severity` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `priority` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'P3',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `resolution` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duplicate_of_bug_id` bigint unsigned DEFAULT NULL,
  `linked_pm_bug_id` bigint unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bugzilla_bugs_bug_number_unique` (`bug_number`),
  KEY `bugzilla_bugs_duplicate_of_bug_id_foreign` (`duplicate_of_bug_id`),
  KEY `bugzilla_bugs_linked_pm_bug_id_foreign` (`linked_pm_bug_id`),
  KEY `bugzilla_bugs_bugzilla_project_id_index` (`bugzilla_project_id`),
  KEY `bugzilla_bugs_portal_project_id_index` (`portal_project_id`),
  KEY `bugzilla_bugs_task_id_index` (`task_id`),
  KEY `bugzilla_bugs_component_id_index` (`component_id`),
  KEY `bugzilla_bugs_reporter_id_index` (`reporter_id`),
  KEY `bugzilla_bugs_assignee_id_index` (`assignee_id`),
  KEY `bugzilla_bugs_status_index` (`status`),
  KEY `bugzilla_bugs_severity_index` (`severity`),
  KEY `bugzilla_bugs_priority_index` (`priority`),
  KEY `bugzilla_bugs_resolution_index` (`resolution`),
  KEY `bugzilla_bugs_created_at_index` (`created_at`),
  CONSTRAINT `bugzilla_bugs_assignee_id_foreign` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugzilla_bugs_bugzilla_project_id_foreign` FOREIGN KEY (`bugzilla_project_id`) REFERENCES `bugzilla_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_bugs_component_id_foreign` FOREIGN KEY (`component_id`) REFERENCES `bugzilla_components` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugzilla_bugs_duplicate_of_bug_id_foreign` FOREIGN KEY (`duplicate_of_bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugzilla_bugs_linked_pm_bug_id_foreign` FOREIGN KEY (`linked_pm_bug_id`) REFERENCES `pm_task_bugs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugzilla_bugs_portal_project_id_foreign` FOREIGN KEY (`portal_project_id`) REFERENCES `pm_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_bugs_reporter_id_foreign` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_bugs_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `pm_tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bug_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bugzilla_comments_user_id_foreign` (`user_id`),
  KEY `bugzilla_comments_bug_id_index` (`bug_id`),
  CONSTRAINT `bugzilla_comments_bug_id_foreign` FOREIGN KEY (`bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_components` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bugzilla_project_id` bigint unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `default_assignee_id` bigint unsigned DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bugzilla_components_bugzilla_project_id_name_unique` (`bugzilla_project_id`,`name`),
  KEY `bugzilla_components_default_assignee_id_foreign` (`default_assignee_id`),
  CONSTRAINT `bugzilla_components_bugzilla_project_id_foreign` FOREIGN KEY (`bugzilla_project_id`) REFERENCES `bugzilla_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_components_default_assignee_id_foreign` FOREIGN KEY (`default_assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1090 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_dependencies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bug_id` bigint unsigned NOT NULL,
  `depends_on_bug_id` bigint unsigned NOT NULL,
  `relationship_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'depends_on',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bugzilla_dep_unique` (`bug_id`,`depends_on_bug_id`,`relationship_type`),
  KEY `bugzilla_dependencies_depends_on_bug_id_foreign` (`depends_on_bug_id`),
  CONSTRAINT `bugzilla_dependencies_bug_id_foreign` FOREIGN KEY (`bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_dependencies_depends_on_bug_id_foreign` FOREIGN KEY (`depends_on_bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bug_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bugzilla_history_user_id_foreign` (`user_id`),
  KEY `bugzilla_history_bug_id_index` (`bug_id`),
  KEY `bugzilla_history_created_at_index` (`created_at`),
  CONSTRAINT `bugzilla_history_bug_id_foreign` FOREIGN KEY (`bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_history_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_labels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bugzilla_labels_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `portal_project_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `default_assignee_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bugzilla_projects_portal_project_id_unique` (`portal_project_id`),
  KEY `bugzilla_projects_default_assignee_id_foreign` (`default_assignee_id`),
  KEY `bugzilla_projects_created_by_foreign` (`created_by`),
  CONSTRAINT `bugzilla_projects_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugzilla_projects_default_assignee_id_foreign` FOREIGN KEY (`default_assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugzilla_projects_portal_project_id_foreign` FOREIGN KEY (`portal_project_id`) REFERENCES `pm_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=364 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_saved_searches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criteria` json NOT NULL,
  `is_shared` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bugzilla_saved_searches_user_id_index` (`user_id`),
  CONSTRAINT `bugzilla_saved_searches_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bugzilla_watchers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bug_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bugzilla_watchers_bug_id_user_id_unique` (`bug_id`,`user_id`),
  KEY `bugzilla_watchers_user_id_foreign` (`user_id`),
  CONSTRAINT `bugzilla_watchers_bug_id_foreign` FOREIGN KEY (`bug_id`) REFERENCES `bugzilla_bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bugzilla_watchers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_message_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `message_id` bigint unsigned NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_message_attachments_message_id_foreign` (`message_id`),
  CONSTRAINT `chat_message_attachments_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint unsigned NOT NULL,
  `sender_id` bigint unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `message_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `is_edited` tinyint(1) NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_messages_sender_id_foreign` (`sender_id`),
  KEY `chat_messages_conversation_id_created_at_index` (`conversation_id`,`created_at`),
  CONSTRAINT `chat_messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_post_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `community_post_comments_post_id_foreign` (`post_id`),
  KEY `community_post_comments_user_id_foreign` (`user_id`),
  CONSTRAINT `community_post_comments_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `community_post_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_post_likes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `reaction_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'like',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `community_post_likes_post_id_user_id_unique` (`post_id`,`user_id`),
  KEY `community_post_likes_user_id_foreign` (`user_id`),
  CONSTRAINT `community_post_likes_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `community_post_likes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'post',
  `media_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `poll_data` json DEFAULT NULL,
  `likes_count` int unsigned NOT NULL DEFAULT '0',
  `comments_count` int unsigned NOT NULL DEFAULT '0',
  `pinned` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `community_posts_user_id_foreign` (`user_id`),
  CONSTRAINT `community_posts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `last_read_at` timestamp NULL DEFAULT NULL,
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `is_muted` tinyint(1) NOT NULL DEFAULT '0',
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversation_participants_conversation_id_user_id_unique` (`conversation_id`,`user_id`),
  KEY `conversation_participants_user_id_foreign` (`user_id`),
  CONSTRAINT `conversation_participants_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_participants_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'direct',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conversations_created_by_foreign` (`created_by`),
  CONSTRAINT `conversations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_team_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `permission_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` bigint unsigned NOT NULL,
  `scope` enum('all_members','leads_only') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all_members',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_perm_team` (`permission_key`,`team_id`),
  KEY `custom_team_permissions_team_id_foreign` (`team_id`),
  KEY `custom_team_permissions_permission_key_index` (`permission_key`),
  CONSTRAINT `custom_team_permissions_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_user_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `permission_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_perm_user` (`permission_key`,`user_id`),
  KEY `custom_user_permissions_user_id_foreign` (`user_id`),
  KEY `custom_user_permissions_permission_key_index` (`permission_key`),
  CONSTRAINT `custom_user_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customization_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `font_family` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Proxima Nova',
  `header_bg_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#56348f',
  `header_text_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#ffffff',
  `header_subtitle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PERFECTION AT ITS FINEST',
  `primary_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#56348f',
  `body_font_size` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '13px',
  `heading_scale` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `description_font_size` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '12px',
  `page_title_base` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Inter Smart',
  `page_title_format` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '{title} | {pagename}',
  `extra_colors` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `sidebar_bg_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#0e2638',
  `favicon_url` longtext COLLATE utf8mb4_unicode_ci,
  `logo_url` longtext COLLATE utf8mb4_unicode_ci,
  `border_radius` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '12px',
  `sub_header_bg` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#ffffff',
  `sub_header_active_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#56348f',
  `login_heading` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Sign in to your workplace',
  `login_subheading` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Perfection at its finest. Workforce management portal',
  `title_separator` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '|',
  `show_header_subtitle` tinyint(1) NOT NULL DEFAULT '1',
  `sidebar_active_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#133249',
  `card_elevation` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'subtle',
  `button_style` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rounded',
  `density` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'comfortable',
  `footer_copyright` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '© 2026 Inter Smart. All rights reserved.',
  `welcome_banner_url` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `request_number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('Pending','Uploaded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_requests_request_number_unique` (`request_number`),
  KEY `document_requests_user_id_foreign` (`user_id`),
  CONSTRAINT `document_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_uploads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `document_request_id` bigint unsigned NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `document_uploads_document_request_id_foreign` (`document_request_id`),
  CONSTRAINT `document_uploads_document_request_id_foreign` FOREIGN KEY (`document_request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emergency_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_bg` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bg-indigo-500',
  `initials` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `emergency_contacts_is_active_index` (`is_active`),
  KEY `emergency_contacts_order_index` (`order`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_leave_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `custom_monthly_cl` decimal(4,2) DEFAULT NULL,
  `custom_monthly_sl` decimal(4,2) DEFAULT NULL,
  `custom_probation_months` smallint unsigned DEFAULT NULL,
  `probation_cleared_manually` tinyint(1) NOT NULL DEFAULT '0',
  `probation_cleared_at` timestamp NULL DEFAULT NULL,
  `probation_cleared_by` bigint unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_leave_policies_user_id_unique` (`user_id`),
  KEY `employee_leave_policies_probation_cleared_by_foreign` (`probation_cleared_by`),
  CONSTRAINT `employee_leave_policies_probation_cleared_by_foreign` FOREIGN KEY (`probation_cleared_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_leave_policies_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `holidays` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Public Holiday',
  `description` text COLLATE utf8mb4_unicode_ci,
  `applicable_team_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `issue_id` bigint unsigned NOT NULL,
  `issue_comment_id` bigint unsigned DEFAULT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `issue_attachments_issue_id_foreign` (`issue_id`),
  KEY `issue_attachments_issue_comment_id_foreign` (`issue_comment_id`),
  CONSTRAINT `issue_attachments_issue_comment_id_foreign` FOREIGN KEY (`issue_comment_id`) REFERENCES `issue_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `issue_attachments_issue_id_foreign` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `issue_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `issue_comments_issue_id_foreign` (`issue_id`),
  KEY `issue_comments_user_id_foreign` (`user_id`),
  CONSTRAINT `issue_comments_issue_id_foreign` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE,
  CONSTRAINT `issue_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `issues` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_link` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_module` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open',
  `assigned_to` bigint unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `issues_user_id_foreign` (`user_id`),
  KEY `issues_assigned_to_foreign` (`assigned_to`),
  CONSTRAINT `issues_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `issues_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_allocation_ledgers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `leave_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(5,2) NOT NULL,
  `transaction_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_key` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_balance` decimal(6,2) NOT NULL,
  `closing_balance` decimal(6,2) NOT NULL,
  `modified_by` bigint unsigned DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `carry_forward_year` int DEFAULT NULL,
  `expires_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_allocation_ledgers_modified_by_foreign` (`modified_by`),
  KEY `idx_user_cycle_trans_type` (`user_id`,`cycle_key`,`transaction_type`,`leave_type`),
  KEY `leave_allocation_ledgers_cycle_key_index` (`cycle_key`),
  CONSTRAINT `leave_allocation_ledgers_modified_by_foreign` FOREIGN KEY (`modified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leave_allocation_ledgers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=276 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `leave_request_id` bigint unsigned NOT NULL,
  `modified_by` bigint unsigned NOT NULL,
  `previous_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_audit_logs_leave_request_id_foreign` (`leave_request_id`),
  KEY `leave_audit_logs_modified_by_foreign` (`modified_by`),
  CONSTRAINT `leave_audit_logs_leave_request_id_foreign` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_audit_logs_modified_by_foreign` FOREIGN KEY (`modified_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_balance_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `leave_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `previous_balance` decimal(5,1) NOT NULL,
  `new_balance` decimal(5,1) NOT NULL,
  `modified_by` bigint unsigned NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_balance_audit_logs_user_id_foreign` (`user_id`),
  KEY `leave_balance_audit_logs_modified_by_foreign` (`modified_by`),
  CONSTRAINT `leave_balance_audit_logs_modified_by_foreign` FOREIGN KEY (`modified_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_balance_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `casual_leave_balance` decimal(5,1) NOT NULL DEFAULT '0.0',
  `cl_carry_forward` decimal(5,1) NOT NULL DEFAULT '0.0',
  `cl_carry_forward_year` int DEFAULT NULL,
  `sick_leave_balance` decimal(5,1) NOT NULL DEFAULT '0.0',
  `total_leaves_taken` decimal(5,1) NOT NULL DEFAULT '0.0',
  `probation_leaves_allocated` tinyint(1) NOT NULL DEFAULT '0',
  `probation_cleared_manually` tinyint(1) NOT NULL DEFAULT '0',
  `last_allocated_cycle` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_balances_user_id_index` (`user_id`),
  CONSTRAINT `leave_balances_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_ledgers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `transaction_type` enum('Credit','Debit','Expiry') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(5,1) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_ledgers_user_id_foreign` (`user_id`),
  KEY `leave_ledgers_leave_type_id_foreign` (`leave_type_id`),
  CONSTRAINT `leave_ledgers_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_ledgers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_policy_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `monthly_cycle_start_day` tinyint unsigned NOT NULL DEFAULT '26',
  `probation_period_months` smallint unsigned NOT NULL DEFAULT '6',
  `default_monthly_cl` decimal(4,2) NOT NULL DEFAULT '1.00',
  `default_monthly_sl` decimal(4,2) NOT NULL DEFAULT '1.00',
  `cl_carry_forward_years` smallint unsigned NOT NULL DEFAULT '2',
  `sl_carry_forward_allowed` tinyint(1) NOT NULL DEFAULT '0',
  `cl_advance_notice_days` smallint unsigned NOT NULL DEFAULT '3',
  `wfh_morning_cutoff_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '09:45',
  `wfh_afternoon_cutoff_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '14:30',
  `late_threshold_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '09:40',
  `single_day_approval_level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tl_only',
  `multi_day_approval_threshold` smallint unsigned NOT NULL DEFAULT '2',
  `lop_admin_approval_required` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `leave_type_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `days` decimal(4,1) NOT NULL DEFAULT '1.0',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_link` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `tl_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `admin_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `approved_by` bigint unsigned DEFAULT NULL,
  `approver_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_unpaid` tinyint(1) NOT NULL DEFAULT '0',
  `unpaid_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sandwich_leave_days` double NOT NULL DEFAULT '0',
  `actual_leave_days` double DEFAULT NULL,
  `paid_casual_leave` double NOT NULL DEFAULT '0',
  `paid_cl_carry_forward` double NOT NULL DEFAULT '0',
  `paid_cl_current_year` double NOT NULL DEFAULT '0',
  `paid_sick_leave` double NOT NULL DEFAULT '0',
  `lop_days` double NOT NULL DEFAULT '0',
  `pending_lop_conversion` tinyint(1) NOT NULL DEFAULT '0',
  `lop_conversion_source_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_requests_leave_type_id_foreign` (`leave_type_id`),
  KEY `leave_requests_user_id_index` (`user_id`),
  KEY `leave_requests_status_index` (`status`),
  KEY `leave_requests_leave_date_index` (`start_date`),
  CONSTRAINT `leave_requests_leave_type_id_foreign` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  CONSTRAINT `leave_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notifiable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notifiable_id` bigint unsigned NOT NULL,
  `data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notifiable_type_notifiable_id_index` (`notifiable_type`,`notifiable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=640 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_addons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Bug',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_addons_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_checklist_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `checklistable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checklistable_id` bigint unsigned NOT NULL,
  `checklist_item_id` bigint unsigned NOT NULL,
  `is_checked` tinyint(1) NOT NULL DEFAULT '0',
  `checked_by` bigint unsigned DEFAULT NULL,
  `checked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_checklist_assignments_unique` (`checklistable_type`,`checklistable_id`,`checklist_item_id`),
  KEY `pm_checklist_assignments_checklist_item_id_foreign` (`checklist_item_id`),
  KEY `pm_checklist_assignments_checked_by_foreign` (`checked_by`),
  KEY `pm_checklist_assignments_morph_index` (`checklistable_type`,`checklistable_id`),
  CONSTRAINT `pm_checklist_assignments_checked_by_foreign` FOREIGN KEY (`checked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_checklist_assignments_checklist_item_id_foreign` FOREIGN KEY (`checklist_item_id`) REFERENCES `pm_checklist_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_checklist_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `applies_to` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'project',
  `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_checklist_items_label_unique` (`label`),
  KEY `pm_checklist_items_created_by_foreign` (`created_by`),
  CONSTRAINT `pm_checklist_items_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_correction_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `correction_id` bigint unsigned NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pm_correction_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `pm_correction_attachments_correction_id_index` (`correction_id`),
  CONSTRAINT `pm_correction_attachments_correction_id_foreign` FOREIGN KEY (`correction_id`) REFERENCES `pm_corrections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_correction_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_correction_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `correction_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_correction_comments_user_id_foreign` (`user_id`),
  KEY `pm_correction_comments_correction_id_index` (`correction_id`),
  CONSTRAINT `pm_correction_comments_correction_id_foreign` FOREIGN KEY (`correction_id`) REFERENCES `pm_corrections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_correction_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_corrections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `correction_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Other',
  `severity` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `raised_by` bigint unsigned NOT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `raised_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_corrections_raised_by_foreign` (`raised_by`),
  KEY `pm_corrections_assigned_to_foreign` (`assigned_to`),
  KEY `pm_corrections_created_by_foreign` (`created_by`),
  KEY `pm_corrections_project_id_status_index` (`project_id`,`status`),
  KEY `pm_corrections_task_id_index` (`task_id`),
  CONSTRAINT `pm_corrections_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_corrections_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_corrections_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `pm_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_corrections_raised_by_foreign` FOREIGN KEY (`raised_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_corrections_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `pm_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_hubstaff_tokens` (
  `id` bigint unsigned NOT NULL,
  `access_token` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `refresh_token` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` bigint NOT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `pm_hubstaff_tokens_single_row` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_project_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `project_role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Member',
  `added_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_project_members_project_id_user_id_unique` (`project_id`,`user_id`),
  KEY `pm_project_members_user_id_foreign` (`user_id`),
  KEY `pm_project_members_added_by_foreign` (`added_by`),
  CONSTRAINT `pm_project_members_added_by_foreign` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_project_members_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `pm_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_project_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Planning',
  `is_live` tinyint(1) NOT NULL DEFAULT '0',
  `live_date` date DEFAULT NULL,
  `project_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` bigint unsigned DEFAULT NULL,
  `project_coordinator_id` bigint unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `expected_end_date` date DEFAULT NULL,
  `allotted_effort` decimal(8,2) DEFAULT NULL,
  `confirmed_effort` decimal(8,2) DEFAULT NULL,
  `expected_effort` decimal(8,2) DEFAULT NULL,
  `committed_effort` decimal(8,2) DEFAULT NULL,
  `hubstaff_project_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blockers` text COLLATE utf8mb4_unicode_ci,
  `budget` decimal(12,2) DEFAULT NULL,
  `live_notes` text COLLATE utf8mb4_unicode_ci,
  `live_marked_by` bigint unsigned DEFAULT NULL,
  `fixing_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name_normalized` varchar(255) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when (`deleted_at` is null) then lower(trim(`name`)) else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_projects_name_unique` (`name_normalized`),
  KEY `pm_projects_created_by_foreign` (`created_by`),
  KEY `pm_projects_updated_by_foreign` (`updated_by`),
  KEY `pm_projects_team_id_index` (`team_id`),
  KEY `pm_projects_project_coordinator_id_index` (`project_coordinator_id`),
  KEY `pm_projects_status_index` (`status`),
  KEY `pm_projects_live_marked_by_foreign` (`live_marked_by`),
  CONSTRAINT `pm_projects_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_projects_live_marked_by_foreign` FOREIGN KEY (`live_marked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_projects_project_coordinator_id_foreign` FOREIGN KEY (`project_coordinator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_projects_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_projects_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=381 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_settings_key_unique` (`key`),
  KEY `pm_settings_updated_by_foreign` (`updated_by`),
  CONSTRAINT `pm_settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_sub_phases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `scope_key` varchar(300) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (concat(coalesce(`team_id`,0),_utf8mb4'|',lower(trim(`name`)))) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_sub_phases_scope_name_unique` (`scope_key`),
  KEY `pm_sub_phases_created_by_foreign` (`created_by`),
  KEY `pm_sub_phases_team_id_index` (`team_id`),
  CONSTRAINT `pm_sub_phases_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_sub_phases_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_task_assignees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `assigned_by` bigint unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `individual_status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `progress_percentage` decimal(5,2) DEFAULT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_task_assignees_task_id_user_id_unique` (`task_id`,`user_id`),
  KEY `pm_task_assignees_user_id_foreign` (`user_id`),
  KEY `pm_task_assignees_assigned_by_foreign` (`assigned_by`),
  CONSTRAINT `pm_task_assignees_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_task_assignees_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `pm_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_task_assignees_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=508 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_task_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pm_task_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `pm_task_attachments_task_id_index` (`task_id`),
  CONSTRAINT `pm_task_attachments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `pm_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_task_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_task_bugs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `bug_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open',
  `description` text COLLATE utf8mb4_unicode_ci,
  `reported_by` bigint unsigned NOT NULL,
  `fixed_by` bigint unsigned DEFAULT NULL,
  `reported_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fixed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_task_bugs_reported_by_foreign` (`reported_by`),
  KEY `pm_task_bugs_fixed_by_foreign` (`fixed_by`),
  KEY `pm_task_bugs_task_id_bug_type_index` (`task_id`,`bug_type`),
  KEY `pm_task_bugs_status_index` (`status`),
  CONSTRAINT `pm_task_bugs_fixed_by_foreign` FOREIGN KEY (`fixed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_task_bugs_reported_by_foreign` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_task_bugs_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `pm_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_task_catalogs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_task_catalogs_created_by_foreign` (`created_by`),
  KEY `pm_task_catalogs_updated_by_foreign` (`updated_by`),
  KEY `pm_task_catalogs_is_active_index` (`is_active`),
  KEY `pm_task_catalogs_category_index` (`category`),
  KEY `pm_task_catalogs_name_index` (`name`),
  CONSTRAINT `pm_task_catalogs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_task_catalogs_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_task_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_task_comments_user_id_foreign` (`user_id`),
  KEY `pm_task_comments_task_id_index` (`task_id`),
  CONSTRAINT `pm_task_comments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `pm_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_task_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `sub_phase_id` bigint unsigned DEFAULT NULL,
  `catalog_task_id` bigint unsigned DEFAULT NULL,
  `coordinator_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'In Progress',
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_completion_date` date DEFAULT NULL,
  `include_saturday` tinyint(1) NOT NULL DEFAULT '0',
  `include_sunday` tinyint(1) NOT NULL DEFAULT '0',
  `current_updates` text COLLATE utf8mb4_unicode_ci,
  `deviation_reason` text COLLATE utf8mb4_unicode_ci,
  `sprint` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sprint_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allotted_days` decimal(6,2) DEFAULT NULL,
  `time_taken` decimal(6,2) DEFAULT NULL,
  `days_taken` decimal(6,2) DEFAULT NULL,
  `deviation` decimal(6,2) DEFAULT NULL,
  `activity_percentage` decimal(5,2) DEFAULT NULL,
  `html_bugs` int unsigned DEFAULT '0',
  `functional_bugs` int unsigned DEFAULT '0',
  `total_bugs` int unsigned DEFAULT '0',
  `bug_tracker_link` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_tasks_sub_phase_id_foreign` (`sub_phase_id`),
  KEY `pm_tasks_created_by_foreign` (`created_by`),
  KEY `pm_tasks_updated_by_foreign` (`updated_by`),
  KEY `pm_tasks_project_id_status_index` (`project_id`,`status`),
  KEY `pm_tasks_due_date_index` (`due_date`),
  KEY `pm_tasks_team_id_index` (`team_id`),
  KEY `pm_tasks_coordinator_id_index` (`coordinator_id`),
  KEY `pm_tasks_catalog_task_id_index` (`catalog_task_id`),
  CONSTRAINT `pm_tasks_catalog_task_id_foreign` FOREIGN KEY (`catalog_task_id`) REFERENCES `pm_task_catalogs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_tasks_coordinator_id_foreign` FOREIGN KEY (`coordinator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_tasks_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `pm_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_tasks_sub_phase_id_foreign` FOREIGN KEY (`sub_phase_id`) REFERENCES `pm_sub_phases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_tasks_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pm_tasks_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=688 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_team_addons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `addon_id` bigint unsigned NOT NULL,
  `team_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_team_addons_addon_id_team_id_unique` (`addon_id`,`team_id`),
  KEY `pm_team_addons_team_id_foreign` (`team_id`),
  CONSTRAINT `pm_team_addons_addon_id_foreign` FOREIGN KEY (`addon_id`) REFERENCES `pm_addons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pm_team_addons_team_id_foreign` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pm_user_hubstaff_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `hubstaff_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `linked_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_user_hubstaff_links_user_id_unique` (`user_id`),
  KEY `pm_user_hubstaff_links_linked_by_foreign` (`linked_by`),
  CONSTRAINT `pm_user_hubstaff_links_linked_by_foreign` FOREIGN KEY (`linked_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pm_user_hubstaff_links_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile_update_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `requested_data` json NOT NULL,
  `status` enum('Pending','Approved','Rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `profile_update_requests_user_id_foreign` (`user_id`),
  KEY `profile_update_requests_reviewed_by_foreign` (`reviewed_by`),
  CONSTRAINT `profile_update_requests_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `profile_update_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recognitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `recognitions_user_id_foreign` (`user_id`),
  KEY `recognitions_created_by_foreign` (`created_by`),
  CONSTRAINT `recognitions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recognitions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sticky_notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'amber',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `order_index` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sticky_notes_user_id_is_pinned_index` (`user_id`,`is_pinned`),
  KEY `sticky_notes_user_id_order_index_index` (`user_id`,`order_index`),
  CONSTRAINT `sticky_notes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ta_request_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ta_request_id` bigint unsigned NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ta_request_items_ta_request_id_index` (`ta_request_id`),
  CONSTRAINT `ta_request_items_ta_request_id_foreign` FOREIGN KEY (`ta_request_id`) REFERENCES `ta_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ta_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_travelled` date NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  `bill_link` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Applied',
  `approver_id` bigint unsigned DEFAULT NULL,
  `approval_notes` text COLLATE utf8mb4_unicode_ci,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_receipt_link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_mode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT '0',
  `paid_at` datetime DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ta_requests_approver_id_foreign` (`approver_id`),
  KEY `ta_requests_created_by_foreign` (`created_by`),
  KEY `ta_requests_updated_by_foreign` (`updated_by`),
  KEY `ta_requests_user_id_index` (`user_id`),
  KEY `ta_requests_status_index` (`status`),
  KEY `ta_requests_created_at_index` (`created_at`),
  CONSTRAINT `ta_requests_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ta_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ta_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ta_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `team_lead_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teams_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_favorites` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `page_href` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_favorites_user_id_page_href_unique` (`user_id`,`page_href`),
  CONSTRAINT `user_favorites_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `personal_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` bigint unsigned DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_group` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marital_status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanent_address` text COLLATE utf8mb4_unicode_ci,
  `current_address` text COLLATE utf8mb4_unicode_ci,
  `contact_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternate_contact_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Disabled','Resigned','Terminated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `is_emergency_contact` tinyint(1) NOT NULL DEFAULT '0',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_employee_code_unique` (`employee_code`),
  KEY `users_team_id_index` (`team_id`),
  KEY `users_status_index` (`status`),
  KEY `users_first_name_index` (`first_name`),
  KEY `users_last_name_index` (`last_name`),
  KEY `users_is_emergency_contact_index` (`is_emergency_contact`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wfh_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `wfh_date` date DEFAULT NULL,
  `duration_type` enum('Full','Half-Morning','Half-Afternoon') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Full',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `tl_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `admin_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `approved_by` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `wfh_type_id` bigint unsigned DEFAULT NULL,
  `attachment_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wfh_requests_user_id_foreign` (`user_id`),
  KEY `wfh_requests_wfh_type_id_foreign` (`wfh_type_id`),
  CONSTRAINT `wfh_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wfh_requests_wfh_type_id_foreign` FOREIGN KEY (`wfh_type_id`) REFERENCES `leave_types` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `working_days_overrides` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `working_days_overrides_date_unique` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_06_28_173745_create_teams_table',1),(5,'2026_06_28_173746_create_holidays_table',1),(6,'2026_06_28_173746_create_leave_types_table',1),(7,'2026_06_28_173747_create_leave_balances_table',1),(8,'2026_06_28_173748_create_leave_ledgers_table',1),(9,'2026_06_28_173748_create_leave_requests_table',1),(10,'2026_06_28_173749_create_wfh_requests_table',1),(11,'2026_06_28_173750_create_announcements_table',1),(12,'2026_06_28_173750_create_hr_policies_table',1),(13,'2026_06_28_173751_create_document_requests_table',1),(14,'2026_06_28_173752_create_audit_logs_table',1),(15,'2026_06_28_173752_create_document_uploads_table',1),(16,'2026_06_28_173753_create_system_settings_table',1),(17,'2026_06_28_174029_create_permission_tables',1),(18,'2026_06_28_180814_create_attendances_table',1),(19,'2026_06_28_180815_create_attendance_breaks_table',1),(20,'2026_06_28_182009_create_personal_access_tokens_table',1),(21,'2026_06_28_185519_create_notifications_table',1),(22,'2026_06_28_190608_add_performance_indexes_to_tables',1),(23,'2026_06_29_000000_create_profile_update_requests_table',1),(24,'2026_06_29_083830_update_leave_requests_table',2),(25,'2026_06_29_100227_rename_leave_date_to_start_date_in_leave_requests',2),(26,'2026_06_29_123434_add_approval_stages_to_requests',3),(27,'2026_06_29_124103_create_announcement_categories_table',3),(28,'2026_06_30_000001_add_carry_forward_and_audit_to_leave_balances',3),(29,'2026_06_30_000002_add_profile_photo_path_to_users',3),(30,'2026_06_30_003541_add_leave_policy_fields_to_leave_requests_table',3),(31,'2026_06_30_003542_create_leave_audit_logs_table',3),(32,'2026_06_30_003543_create_working_days_overrides_table',3),(33,'2026_06_30_050000_create_issues_tables',3),(34,'2026_06_30_050001_create_recognitions_table',3),(35,'2026_07_01_000001_add_probation_end_date_to_users',3),(36,'2026_07_01_000002_update_wfh_requests_add_missing_columns',3),(37,'2026_07_01_000003_make_wfh_date_nullable',4),(38,'2026_07_01_000004_update_document_uploads_add_url',5),(39,'2026_07_01_000005_add_attachment_link_to_issues_and_leave_requests',5),(40,'2026_07_02_000001_add_paid_amounts_to_leave_requests',5),(41,'2026_07_02_133300_add_probation_leaves_allocated_to_leave_balances',5),(42,'2026_07_02_141500_add_lop_days_to_leave_requests',5),(43,'2026_07_02_155000_add_pending_lop_conversion_to_leave_requests',5),(44,'2026_07_03_000001_add_profile_fields_to_users_table',5),(45,'2026_07_03_150000_create_biometric_events_table',5),(46,'2026_07_03_150001_create_biometric_sync_states_table',5),(47,'2026_07_06_180000_add_source_to_attendance_tables',5),(48,'2026_07_09_000001_create_birthday_wishes_table',5),(49,'2026_07_09_000001_make_last_name_nullable',5),(50,'2026_07_10_000001_add_full_day_wfh_leave_type',5),(51,'2026_07_10_000002_add_wfh_type_id_to_wfh_requests',5),(52,'2026_07_10_000003_add_approval_workflow_to_leave_requests',5),(53,'2026_07_11_000001_add_paid_carry_forward_to_leave_requests',5),(54,'2026_07_14_000001_add_description_to_announcements',5),(55,'2026_07_16_000001_setup_team_leads',6),(57,'2026_07_17_000001_create_user_favorites_table',7),(58,'2026_07_24_000001_create_ta_requests_table',7),(59,'2026_07_24_000002_create_ta_request_items_table',7),(60,'2026_07_16_000002_fix_team_lead_team_id',8),(61,'2026_08_18_231000_add_performance_indexes_to_users_and_biometrics',9),(62,'2026_08_23_204500_add_document_url_to_document_uploads_table',10),(63,'2026_08_25_090000_create_pm_projects_table',11),(64,'2026_08_25_090100_create_pm_sub_phases_table',12),(65,'2026_08_25_090200_create_pm_tasks_table',12),(66,'2026_08_25_090300_create_pm_project_members_table',12),(67,'2026_08_25_090400_create_pm_task_assignees_table',12),(68,'2026_08_25_090500_create_pm_task_comments_table',12),(69,'2026_08_25_090600_create_pm_task_attachments_table',12),(70,'2026_08_25_090700_create_pm_task_bugs_table',12),(71,'2026_08_25_090800_create_pm_checklist_items_table',12),(72,'2026_08_25_090900_create_pm_checklist_assignments_table',12),(73,'2026_08_25_091000_create_pm_corrections_table',12),(74,'2026_08_25_091100_create_pm_correction_comments_table',12),(75,'2026_08_25_091200_create_pm_correction_attachments_table',12),(76,'2026_08_25_091300_create_pm_settings_table',12),(77,'2026_08_25_091400_create_pm_hubstaff_tokens_table',13),(78,'2026_08_25_091500_create_pm_user_hubstaff_links_table',13),(79,'2026_08_25_091600_create_pm_task_catalogs_table',14),(80,'2026_08_25_091700_add_catalog_task_id_to_pm_tasks_table',14),(81,'2026_08_26_000001_create_community_posts_tables',15),(82,'2026_08_27_230000_split_multi_assignee_tasks',16),(83,'2026_08_28_140000_add_live_status_to_pm_projects_table',17),(84,'2026_08_28_231500_create_pm_addons_tables',18),(85,'2026_08_28_231501_add_bug_tracking_fields_to_pm_tasks_table',18),(86,'2026_08_29_150000_create_leave_policy_system_tables',19),(87,'2026_08_29_160000_create_custom_team_permissions_table',20),(88,'2026_08_29_170000_create_email_management_and_policy_rules_tables',21),(89,'2026_08_29_180000_add_receipt_and_approval_fields_to_ta_requests_table',22),(90,'2026_08_30_170000_add_cancelled_to_status_enums',23),(91,'2026_08_30_171500_fix_all_leave_and_wfh_status_columns',24),(92,'2026_08_31_000001_create_direct_chat_tables',25),(93,'2026_09_03_140000_create_emergency_contacts_table',26),(94,'2026_09_03_180000_create_sticky_notes_table',26),(95,'2026_09_05_020000_seed_kerala_bank_holidays',27),(96,'2026_09_05_140000_add_is_emergency_contact_to_users_table',28),(97,'2026_09_05_230000_add_late_threshold_time_to_leave_policy_settings_table',28),(98,'2026_09_06_004000_remove_erroneous_september_4_holiday',29),(99,'2026_09_06_140000_create_customization_settings_table',29),(100,'2026_09_06_160000_add_extended_fields_to_customization_settings_table',30),(101,'2026_09_06_170000_add_welcome_banner_to_customization_settings_table',31),(102,'2026_09_06_221000_update_pending_requests_without_team_lead',32),(103,'2026_09_07_111500_alter_source_column_in_attendances_table',32),(104,'2026_09_07_114500_fix_wfh_manual_attendance_timezones',33),(105,'2026_09_07_122000_repair_today_wfh_manual_attendance_timestamps',34),(106,'2026_09_07_181500_unassign_nandana_from_team',35),(107,'2026_09_09_120000_create_bugzilla_tables',36),(108,'2026_09_16_020000_update_employee_dob_and_joining_dates',37),(109,'2026_10_08_120000_create_custom_user_permissions_table',38);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

