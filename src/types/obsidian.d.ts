import "obsidian";

declare module "obsidian" {
	interface View {
		/**
		 * The viewer of the view.
		 */
		viewer: any;
		file: any;
	}
}
