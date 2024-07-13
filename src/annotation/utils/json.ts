import { App, TFile } from "obsidian";
import { IAnnotationStore } from "@/annotation/const/definitions";
import { IPdfJSAnnotationStore } from "@/types/store";

export const annotationsSavePath = (app: App) => {
	return `${app.vault.configDir}/pdf-annotations.json`;
};

export const checkJsonFileExists = async (app: App, path: string) => {
	try {
		await app.vault.adapter.read(path);
		return true;
	} catch (error) {
		console.error(error);
		return false;
	}
};

export const loadAnnotationsJson = async (
	app: App,
): Promise<IPdfJSAnnotationStore> => {
	const exists = await checkJsonFileExists(app, annotationsSavePath(app));
	if (!exists) {
		await initAnnotationsJson(app);
	}

	const result = JSON.parse(
		await app.vault.adapter.read(annotationsSavePath(app)),
	) as IPdfJSAnnotationStore;

	return (
		result || {
			annotations: [],
		}
	);
};

export const updateAnnotationsJson = async (
	app: App,
	file: TFile,
	data: IAnnotationStore[],
) => {
	const exists = await checkJsonFileExists(app, annotationsSavePath(app));
	if (!exists) {
		await initAnnotationsJson(app);
	}

	const result = JSON.parse(
		await app.vault.adapter.read(annotationsSavePath(app)),
	) as IPdfJSAnnotationStore;

	const index = result.annotations.findIndex(
		(query: any) => query.file === file.path,
	);
	if (index === -1) {
		result.annotations.push({
			file: file.path,
			data,
		});
	} else {
		result.annotations[index].data = data;
	}

	await app.vault.adapter.write(
		annotationsSavePath(app),
		JSON.stringify(result, null, 2),
	);
};

export const saveAnnotationsJson = async (
	app: App,
	file: TFile,
	data: IAnnotationStore[],
) => {
	await app.vault.adapter.write(
		annotationsSavePath(app),
		JSON.stringify(
			{
				annotations: [
					{
						file: file.path,
						data,
					},
				],
			},
			null,
			2,
		),
	);
};

export const initAnnotationsJson = async (app: App) => {
	await app.vault.adapter.write(
		annotationsSavePath(app),
		JSON.stringify(
			{
				annotations: [],
			},
			null,
			2,
		),
	);
};
