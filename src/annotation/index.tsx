import "./scss/app.scss";
import { createRoot } from "react-dom/client";
import { CustomToolbarRef, CustomToolbar } from "./components/toolbar";
import { EventBus, PDFPageView, PDFViewerApplication } from "pdfjs";
import { createRef } from "react";
import { Painter } from "./painter";
import { annotationDefinitions } from "./const/definitions";
import React from "react";
import ReactDOM from "react-dom/client";
import PdfAnnotatorPlugin from "@/main";
import { ItemView, normalizePath, TFile } from "obsidian";

export default class PdfjsAnnotationExtension {
	PDFJS_PDFViewerApplication: PDFViewerApplication; // PDF.js 的 PDFViewerApplication 对象
	PDFJS_EventBus: EventBus; // PDF.js 的 EventBus 对象
	$PDFJS_sidebarContainer: HTMLDivElement; // PDF.js 侧边栏容器
	$PDFJS_toolbar_container: HTMLDivElement; // PDF.js 工具栏容器
	$PDFJS_viewerContainer: HTMLDivElement; // PDF.js 页面视图容器
	customToolbarRef: React.RefObject<CustomToolbarRef>; // 自定义工具栏的引用
	painter: Painter; // 画笔实例

	toolbarRoot: ReactDOM.Root;
	toolbarContainer: HTMLDivElement;
	viewer: any;
	view: ItemView;
	plugin: PdfAnnotatorPlugin;
	file: TFile;

	constructor(
		pdfjsViewer: PDFViewerApplication,
		viewer: any,
		view: ItemView,
		plugin: PdfAnnotatorPlugin,
	) {
		// 初始化来自 Obsidian 的对象和属性
		this.viewer = viewer;
		this.view = view;
		this.plugin = plugin;
		this.file = view.file;
		// 初始化 PDF.js 对象和相关属性
		this.PDFJS_PDFViewerApplication = pdfjsViewer;
		this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus;
		this.$PDFJS_sidebarContainer =
			this.PDFJS_PDFViewerApplication.pdfSidebar.sidebarContainer;
		this.$PDFJS_toolbar_container =
			this.PDFJS_PDFViewerApplication.toolbar.toolbarRightEl;
		this.$PDFJS_viewerContainer =
			this.PDFJS_PDFViewerApplication.pdfViewer.container;
		// 使用 createRef 方法创建 React 引用
		this.customToolbarRef = createRef<CustomToolbarRef>();
		// 创建画笔实例
		this.painter = new Painter({
			view: this.view,
			plugin: this.plugin,
			PDFViewerApplication: this.PDFJS_PDFViewerApplication,
			PDFJS_EventBus: this.PDFJS_EventBus,
			setDefaultMode: () => {
				this.customToolbarRef.current.activeAnnotation(
					annotationDefinitions[0],
				);
			},
		});
		// 初始化操作
		this.init();
	}

	/**
	 * @description 初始化 PdfjsAnnotationExtension 类
	 */
	private init(): void {
		this.addCustomStyle();
		this.bindPdfjsEvents();
		this.renderToolbar();
		this.aroundPdfSave();
		this.registerScopeEvents();
	}

	public unload() {
		// this.painter.unmount();
		this.view.containerEl.toggleClass("PdfjsAnnotationExtension", false);
		this.toolbarRoot && this.toolbarRoot.unmount();
		// this.unbindPdfjsEvents();
		this.toolbarContainer.detach();
	}

	/**
	 * @description 添加自定义样式
	 */
	private addCustomStyle(): void {
		// document.body.classList.add("PdfjsAnnotationExtension");
		this.view.containerEl.toggleClass("PdfjsAnnotationExtension", true);
	}

	/**
	 * @description 渲染自定义工具栏
	 */
	private renderToolbar(): void {
		this.toolbarContainer = this.$PDFJS_toolbar_container.createEl("div", {
			cls: "PdfjsAnnotationExtension-toolbar",
		});
		// this.$PDFJS_toolbar_container.insertAdjacentElement(
		// 	"afterend",
		// 	toolbar,
		// );
		this.toolbarRoot = createRoot(this.toolbarContainer);
		this.toolbarRoot.render(
			<CustomToolbar
				ref={this.customToolbarRef}
				onChange={(currentAnnotation, dataTransfer) => {
					this.painter.activate(currentAnnotation, dataTransfer);
				}}
			/>,
		);
	}

	/**
	 * @description 隐藏 PDF.js 编辑模式按钮
	 */
	private hidePdfjsEditorModeButtons(): void {
		const editorModeButtons = document.querySelector(
			"#editorModeButtons",
		) as HTMLDivElement;
		const editorModeSeparator = document.querySelector(
			"#editorModeSeparator",
		) as HTMLDivElement;
		editorModeButtons.style.display = "none";
		editorModeSeparator.style.display = "none";
	}

	/**
	 * @description 绑定 PDF.js 相关事件
	 */
	private bindPdfjsEvents(): void {
		// this.hidePdfjsEditorModeButtons();
		// 监听页面渲染完成事件
		this.PDFJS_EventBus._on(
			"pagerendered",
			({
				source,
				cssTransform,
				pageNumber,
			}: {
				source: PDFPageView;
				cssTransform: boolean;
				pageNumber: number;
			}) => {
				this.painter.initCanvas({
					pageView: source,
					cssTransform,
					pageNumber,
				});
				// this.painter.resetPdfjsAnnotationStorage();
			},
		);
		// 监听文档加载完成事件
		this.PDFJS_EventBus._on("textlayerrendered", () => {
			this.painter.initWebSelection(this.$PDFJS_viewerContainer);
		});
		// 重置 Pdfjs AnnotationStorage 解决有嵌入图片打印、下载会ImageBitmap报错的问题
		this.PDFJS_EventBus._on("beforeprint", () => {
			this.painter.resetPdfjsAnnotationStorage();
		});
		this.PDFJS_EventBus._on("download", () => {
			this.painter.resetPdfjsAnnotationStorage();
		});
	}

	private async initCanvasEvent({
		source,
		cssTransform,
		pageNumber,
	}: {
		source: PDFPageView;
		cssTransform: boolean;
		pageNumber: number;
	}) {
		this.painter.initCanvas({
			pageView: source,
			cssTransform,
			pageNumber,
		});
	}

	/**
	 * @description 保存 PDF 时的操作
	 */
	private aroundPdfSave() {
		// this.PDFJS_PDFViewerApplication.save = async () => {
		// 	if (!this.view.file) return;
		//
		// 	let e = arguments[0] !== undefined ? arguments[0] : {};
		// 	if (this.PDFJS_PDFViewerApplication._saveInProgress) {
		// 		return;
		// 	}
		// 	this.PDFJS_PDFViewerApplication._saveInProgress = true;
		// 	await this.PDFJS_PDFViewerApplication.pdfScriptingManager.dispatchWillSave();
		// 	const t = this.PDFJS_PDFViewerApplication._downloadUrl;
		// 	const i = this.PDFJS_PDFViewerApplication._docFilename;
		// 	try {
		// 		this.PDFJS_PDFViewerApplication._ensureDownloadComplete();
		// 		const n =
		// 			(await this.PDFJS_PDFViewerApplication.pdfDocument.saveDocument()) as Uint8Array;
		// 		console.log(n);
		// 		const r = new Blob([n], { type: "application/pdf" });
		// 		// const arrayBuffer = await r.arrayBuffer();
		//
		// 		console.log(this.view);
		// 		const file = await this.plugin.app.vault.adapter.exists(
		// 			normalizePath(this.file.path),
		// 		);
		//
		// 		await this.plugin.app.vault.adapter.writeBinary(
		// 			normalizePath(this.file.path),
		// 			n.buffer,
		// 		);
		// 		// await this.PDFJS_PDFViewerApplication.downloadManager.download(
		// 		// 	r,
		// 		// 	t,
		// 		// 	i,
		// 		// 	e,
		// 		// );
		// 	} catch (t) {
		// 		console.error(`Error when saving the document: ${t.message}`);
		// 		await this.PDFJS_PDFViewerApplication.download(e);
		// 	} finally {
		// 		await this.PDFJS_PDFViewerApplication.pdfScriptingManager.dispatchDidSave();
		// 		this.PDFJS_PDFViewerApplication._saveInProgress = false;
		// 	}
		// 	if (this.PDFJS_PDFViewerApplication._hasAnnotationEditors) {
		// 		this.PDFJS_PDFViewerApplication.externalServices.reportTelemetry(
		// 			{
		// 				type: "editing",
		// 				data: {
		// 					type: "save",
		// 				},
		// 			},
		// 		);
		// 	}
		// };

		this.PDFJS_PDFViewerApplication.save = async (downloadOptions: any) => {
			console.log("save", this.view.file.path, downloadOptions);
			if (!this.view.file) return;

			let options = downloadOptions || {};
			if (this.PDFJS_PDFViewerApplication._saveInProgress) {
				return;
			}
			this.PDFJS_PDFViewerApplication._saveInProgress = true;
			await this.PDFJS_PDFViewerApplication.pdfScriptingManager.dispatchWillSave();
			// 不需要的代码，暂时保留
			// const downloadUrl = this.PDFJS_PDFViewerApplication._downloadUrl;
			// const filename = this.PDFJS_PDFViewerApplication._docFilename;
			try {
				if (options.saveToFile) {
					/**
					 * Currently, because highlight annotations are not supported by Obsidian default PDFjs lib yet.
					 * So don't save the annotations to the PDF file.
					 */

					const annotations = this.painter.getPdfjsAllAnnotations();

					this.PDFJS_PDFViewerApplication._ensureDownloadComplete();
					const savedDocument =
						(await this.PDFJS_PDFViewerApplication.pdfDocument.saveDocument()) as Uint8Array;
					this.painter.resetPdfjsAnnotationStorage();

					await this.plugin.app.vault.adapter.writeBinary(
						normalizePath(this.file.path),
						savedDocument.buffer,
					);
				} else {
					const annotations = this.painter.getPdfjsAllAnnotations();
					this.PDFJS_PDFViewerApplication._ensureDownloadComplete();

					this.plugin.controller.updateAnnotations(
						this.view.file.path,
						annotations,
					);
				}

				// await this.PDFJS_PDFViewerApplication.downloadManager.download(
				//     pdfBlob,
				//     downloadUrl,
				//     filename,
				//     options,
				// );
			} catch (error) {
				console.error(
					`Error when saving the document: ${error.message}`,
				);
				// await this.PDFJS_PDFViewerApplication.download(options);
			} finally {
				// await this.PDFJS_PDFViewerApplication.pdfScriptingManager.dispatchDidSave();
				this.PDFJS_PDFViewerApplication._saveInProgress = false;
			}
			if (this.PDFJS_PDFViewerApplication._hasAnnotationEditors) {
				this.PDFJS_PDFViewerApplication.externalServices.reportTelemetry(
					{
						type: "editing",
						data: {
							type: "save",
						},
					},
				);
			}
		};
	}

	/**
	 * @private
	 * @description 注册 View 层级的事件
	 */
	private registerScopeEvents() {
		// this.view.scope.register(["Mod", "Shift"], "s", () => {
		// 	this.PDFJS_PDFViewerApplication.save({
		// 		saveToFile: true,
		// 	});
		// });
		this.view.scope.register(["Mod"], "s", () => {
			this.PDFJS_PDFViewerApplication.save();
		});

		console.log("registerScopeEvents", this.view.scope);
	}
}

// new PdfjsAnnotationExtension();
