// Copyright 2025 Leon Xia. MIT License.

export interface AboutSection {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly statement: string;
  readonly imagePath: string;
}

export interface AboutSectionData {
  readonly sections: readonly AboutSection[];
}
