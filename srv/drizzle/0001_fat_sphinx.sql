PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sandboxes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`msbName` text NOT NULL,
	`hostPort` integer NOT NULL,
	`guestPort` integer NOT NULL,
	`user` text NOT NULL,
	`memory` integer DEFAULT 512,
	`image` text,
	`status` text DEFAULT 'running',
	`cpu` integer DEFAULT 1,
	`createdAt` text NOT NULL,
	`emephemeral` integer DEFAULT true,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sandboxes`("id", "name", "msbName", "hostPort", "guestPort", "user", "memory", "image", "status", "cpu", "createdAt", "emephemeral") SELECT "id", "name", "msbName", CAST("port" AS INTEGER), 80, "user", "memory", "image", "status", "cpu", "createdAt", "emephemeral" FROM `sandboxes`;--> statement-breakpoint
DROP TABLE `sandboxes`;--> statement-breakpoint
ALTER TABLE `__new_sandboxes` RENAME TO `sandboxes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `sandboxes_msbName_unique` ON `sandboxes` (`msbName`);--> statement-breakpoint
CREATE UNIQUE INDEX `sandboxes_hostPort_unique` ON `sandboxes` (`hostPort`);--> statement-breakpoint
CREATE UNIQUE INDEX `sandbox_name_idx` ON `sandboxes` (`name`);