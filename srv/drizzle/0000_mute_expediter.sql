CREATE TABLE `ports` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`url` text,
	`sandbox` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`sandbox`) REFERENCES `sandboxes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ports_url_unique` ON `ports` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_port_sandbox` ON `ports` (`number`,`sandbox`);--> statement-breakpoint
CREATE TABLE `sandboxes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`msbName` text NOT NULL,
	`port` text NOT NULL,
	`encoded` text NOT NULL,
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
CREATE UNIQUE INDEX `sandboxes_msbName_unique` ON `sandboxes` (`msbName`);--> statement-breakpoint
CREATE UNIQUE INDEX `sandboxes_port_unique` ON `sandboxes` (`port`);--> statement-breakpoint
CREATE UNIQUE INDEX `sandbox_name_idx` ON `sandboxes` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`sessionToken` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_sessionToken_unique` ON `sessions` (`sessionToken`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sandbox` text NOT NULL,
	`user` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_name_idx` ON `snapshots` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'user',
	`password` text NOT NULL,
	`salt` text NOT NULL,
	`limit` integer,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_idx` ON `users` (`email`);