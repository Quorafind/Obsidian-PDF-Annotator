import "./scss/app.scss";
import { createRoot } from "react-dom/client";
import { CustomToolbarRef, CustomToolbar } from "./components/toolbar";
import { EventBus, PDFPageView, PDFViewerApplication } from "pdfjs";
import { createRef } from "react";
import { Painter } from "./painter";
import { annotationDefinitions } from "./const/definitions";
import React from "react";
import ReactDOM from "react-dom/client";
import MyPlugin from "@/main";
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
	viewer: any;
	view: ItemView;
	plugin: MyPlugin;
	file: TFile;

	constructor(
		pdfjsViewer: PDFViewerApplication,
		viewer: any,
		view: ItemView,
		plugin: MyPlugin,
	) {
		this.viewer = viewer;
		this.view = view;
		this.plugin = plugin;
		this.file = view.file;
		// 初始化 PDF.js 对象和相关属性
		this.PDFJS_PDFViewerApplication = pdfjsViewer;
		this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus;
		console.log(pdfjsViewer.pdfViewer);
		console.log(this.PDFJS_PDFViewerApplication.appConfig);
		this.$PDFJS_sidebarContainer =
			this.PDFJS_PDFViewerApplication.pdfSidebar.sidebarContainer;
		this.$PDFJS_toolbar_container =
			this.PDFJS_PDFViewerApplication.toolbar.toolbarEl;
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
	}

	public unload() {
		// this.painter.unmount();
		document.body.classList.remove("PdfjsAnnotationExtension");
		this.toolbarRoot && this.toolbarRoot.unmount();
		// this.unbindPdfjsEvents();
	}

	/**
	 * @description 添加自定义样式
	 */
	private addCustomStyle(): void {
		document.body.classList.add("PdfjsAnnotationExtension");
	}

	/**
	 * @description 渲染自定义工具栏
	 */
	private renderToolbar(): void {
		const toolbar = createEl("div", {
			cls: "PdfjsAnnotationExtension-toolbar",
		});
		this.$PDFJS_toolbar_container.insertAdjacentElement(
			"afterend",
			toolbar,
		);
		this.toolbarRoot = createRoot(toolbar);
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
			this.initCanvasEvent.bind(this),
		);
		// 监听文档加载完成事件
		this.PDFJS_EventBus._on(
			"documentloaded",
			this.loadedDocumentEvent.bind(this),
		);
		// 重置 Pdfjs AnnotationStorage 解决有嵌入图片打印、下载会ImageBitmap报错的问题
		this.PDFJS_EventBus._on("beforeprint", this.printEvent.bind(this));
		this.PDFJS_EventBus._on("download", this.downloadEvent.bind(this));
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

	private loadedDocumentEvent() {
		console.log("loadedDocumentEvent");
		this.painter.initWebSelection(this.$PDFJS_viewerContainer);
	}

	private printEvent() {
		console.log("printEvent");
		this.painter.resetPdfjsAnnotationStorage();
	}

	private downloadEvent() {
		console.log("downloadEvent");
		this.painter.resetPdfjsAnnotationStorage();
	}

	/**
	 * @description 卸载 PDF.js 相关事件
	 */
	private unbindPdfjsEvents(): void {
		this.PDFJS_EventBus._off(
			"pagerendered",
			this.initCanvasEvent.bind(this),
		);
		this.PDFJS_EventBus._off(
			"documentloaded",
			this.loadedDocumentEvent.bind(this),
		);
		this.PDFJS_EventBus._off("beforeprint", this.printEvent.bind(this));
		this.PDFJS_EventBus._off("download", this.downloadEvent.bind(this));
	}

	/**
	 * @description 保存 PDF 时的操作
	 */
	private aroundPdfSave() {
		this.PDFJS_PDFViewerApplication.save = async () => {
			if (!this.view.file) return;

			let e = arguments[0] !== undefined ? arguments[0] : {};
			if (this.PDFJS_PDFViewerApplication._saveInProgress) {
				return;
			}
			this.PDFJS_PDFViewerApplication._saveInProgress = true;
			await this.PDFJS_PDFViewerApplication.pdfScriptingManager.dispatchWillSave();
			const t = this.PDFJS_PDFViewerApplication._downloadUrl;
			const i = this.PDFJS_PDFViewerApplication._docFilename;
			try {
				this.PDFJS_PDFViewerApplication._ensureDownloadComplete();
				const n =
					(await this.PDFJS_PDFViewerApplication.pdfDocument.saveDocument()) as Uint8Array;
				console.log(n);
				const r = new Blob([n], { type: "application/pdf" });
				// const arrayBuffer = await r.arrayBuffer();

				console.log(this.view);
				const file = await this.plugin.app.vault.adapter.exists(
					normalizePath(this.file.path),
				);

				await this.plugin.app.vault.adapter.writeBinary(
					normalizePath(this.file.path),
					n.buffer,
				);
				// await this.PDFJS_PDFViewerApplication.downloadManager.download(
				// 	r,
				// 	t,
				// 	i,
				// 	e,
				// );
			} catch (t) {
				console.error(`Error when saving the document: ${t.message}`);
				await this.PDFJS_PDFViewerApplication.download(e);
			} finally {
				await this.PDFJS_PDFViewerApplication.pdfScriptingManager.dispatchDidSave();
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
}

// new PdfjsAnnotationExtension();
