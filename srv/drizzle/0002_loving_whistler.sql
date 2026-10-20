ALTER TABLE `sandboxes` ADD `distro` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`msbName` text NOT NULL,
	`sandbox` text NOT NULL,
	`user` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_snapshots`(`id`, `name`, `msbName`, `sandbox`, `user`, `createdAt`) SELECT snapshots.`id`, snapshots.`name`, COALESCE(sandboxes.`msbName` || ':' || snapshots.`name`, snapshots.`name`), snapshots.`sandbox`, snapshots.`user`, snapshots.`createdAt` FROM `snapshots` LEFT JOIN `sandboxes` ON sandboxes.`id` = snapshots.`sandbox`;--> statement-breakpoint
DROP TABLE `snapshots`;--> statement-breakpoint
ALTER TABLE `__new_snapshots` RENAME TO `snapshots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_name_idx` ON `snapshots` (`name`);