import { ItemView, Plugin } from "obsidian";
import PdfjsAnnotationExtension from "./annotation";
import { around } from "monkey-around";
// import { around } from "monkey-around";

export default class MyPlugin extends Plugin {
	pdfAnnotators: PdfjsAnnotationExtension[] = [];

	async onload() {
		const leaves = this.app.workspace.getLeavesOfType("pdf");
		if (leaves.length > 0) {
			for (const leaf of leaves) {
				if (!leaf.view.viewer) continue;
				if (leaf.view.viewer.pdfAnnotator) continue;
				const annotator = new PdfjsAnnotationExtension(
					leaf.view.viewer.child.pdfViewer,
					leaf.view.viewer,
					leaf.view as ItemView,
					this,
				);
				this.pdfAnnotators.push(annotator);
			}
		}

		this.app.workspace.on("active-leaf-change", (leaf) => {
			if (leaf.view.file && leaf.view.file.extension === "pdf") {
				if (!leaf.view.viewer) return;
				if (leaf.view.viewer.pdfAnnotator) return;
				const annotator = new PdfjsAnnotationExtension(
					leaf.view.viewer.child.pdfViewer,
					leaf.view.viewer,

					leaf.view as ItemView,
					this,
				);
				leaf.view.viewer.pdfAnnotator = annotator;
				this.pdfAnnotators.push(annotator);
			}
		});

		this.patchPDFViewer();
	}

	onunload() {
		for (const annotator of this.pdfAnnotators) {
			annotator.unload();
			annotator.viewer.pdfAnnotator = null;
		}
		this.pdfAnnotators = [];
	}

	patchPDFViewer() {
		const uninstaller = around(ItemView.prototype, {
			unload: (next: any) =>
				function () {
					if (this.file && this.file.extension === "pdf") {
						const annotator = this.viewer.pdfAnnotator;
						if (annotator) {
							annotator.unload();
						}
						this.viewer.pdfAnnotator = null;
					}
					return next.call(this);
				},
		});

		this.register(uninstaller);
	}
}
