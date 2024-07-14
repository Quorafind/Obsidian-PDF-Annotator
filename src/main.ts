import { App, Component, ItemView, Plugin, WorkspaceLeaf } from "obsidian";
import PdfjsAnnotationExtension from "./annotation";
import { around } from "monkey-around";
import { IAnnotationStore } from "@/annotation/const/definitions";
import {
	annotationsSavePath,
	loadAnnotationsJson,
} from "@/annotation/utils/json";
import { IPdfJSAnnotationStore } from "@/types/store";

export default class PdfAnnotatorPlugin extends Plugin {
	pdfAnnotators: PdfjsAnnotationExtension[] = [];
	public controller: IAnnotationStoreController =
		new IAnnotationStoreController(this.app);

	async onload() {
		await this.controller.onload();
		const leaves = this.app.workspace.getLeavesOfType("pdf");
		if (leaves.length > 0) {
			for (const leaf of leaves) {
				this.createToolbar(leaf, this);
			}
		}

		this.patchView(this);
		this.patchPDFViewer();
	}

	onunload() {
		for (const annotator of this.pdfAnnotators) {
			annotator.unload();
			annotator.viewer.pdfAnnotator = null;
		}
		this.pdfAnnotators = [];
	}

	createToolbar(leaf: WorkspaceLeaf, plugin: PdfAnnotatorPlugin) {
		if (!leaf.view.viewer || leaf.view.viewer.pdfAnnotator) return;
		const annotator = new PdfjsAnnotationExtension(
			leaf.view.viewer.child.pdfViewer,
			leaf.view.viewer,
			leaf.view as ItemView,
			this,
		);
		this.pdfAnnotators.push(annotator);
	}

	patchView(plugin: PdfAnnotatorPlugin) {
		const uninstaller = around(WorkspaceLeaf.prototype, {
			setViewState: (next: any) =>
				function (viewState, eState) {
					const result = next.call(this, viewState, eState);
					if (viewState.type === "pdf") {
						setTimeout(() => {
							plugin.createToolbar(this, plugin);
						}, 200);
						// uninstaller();
					}
					return result;
				},
		});

		this.register(uninstaller);
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

class IAnnotationStoreController extends Component {
	store: IPdfJSAnnotationStore;
	annotations: {
		file: string;
		data: IAnnotationStore[];
	}[] = [];
	app: App;

	constructor(app: App) {
		super();
		this.app = app;
	}

	async onload() {
		super.onload();
		this.store = await loadAnnotationsJson(this.app);
		this.annotations = this.store.annotations || [];
	}

	getAnnotation(file: string) {
		return this.annotations.find((query) => query.file === file);
	}

	getAllAnnotations() {
		return this.annotations;
	}

	updateAnnotations(file: string, data: IAnnotationStore[]) {
		const index = this.annotations.findIndex(
			(query: any) => query.file === file,
		);
		if (index === -1) {
			this.annotations.push({
				file,
				data,
			});
		} else {
			this.annotations[index].data = data;
		}

		this.saveAnnotations();
	}

	removeAnnotations(file: string) {
		const index = this.annotations.findIndex(
			(query: any) => query.file === file,
		);
		if (index !== -1) {
			this.annotations.splice(index, 1);
		}
	}

	deleteAnnotation(file: string, annotationId: string) {
		const index = this.annotations.findIndex(
			(query: any) => query.file === file,
		);
		if (index !== -1) {
			const annotationIndex = this.annotations[index].data.findIndex(
				(annotation) => annotation.id === annotationId,
			);
			if (annotationIndex !== -1) {
				this.annotations[index].data.splice(annotationIndex, 1);
			}
		}
		this.saveAnnotations();
	}

	saveAnnotations() {
		this.store.annotations = this.annotations;
		this.app.vault.adapter.write(
			annotationsSavePath(this.app),
			JSON.stringify(this.store, null, 2),
		);
	}

	clearAnnotations() {
		this.store.annotations = [];
		this.app.vault.adapter.write(
			annotationsSavePath(this.app),
			JSON.stringify(this.store, null, 2),
		);
	}
}
