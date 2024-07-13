import { IAnnotationStore } from "@/annotation/const/definitions";

interface IPdfJSAnnotationStore {
	annotations: {
		file: string;
		data: IAnnotationStore[];
	}[];
}
