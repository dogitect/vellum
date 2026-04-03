// Copyright 2025 Leon Xia. MIT License.

export interface WorkSlide {
  readonly index: number;
  readonly path: string;
  readonly filename: string;
}

export interface ProjectMetadata {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly date: string;
  /** Number of slides in this project */
  readonly slideCount?: number;
}

export interface CategoryMetadata {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly coverImage: string;
}

export interface WorkProject {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly date: string;
  readonly basePath: string;
  /** Number of slides in this project */
  readonly slideCount: number;
  readonly slides?: readonly WorkSlide[];
}

export interface WorkCategory {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly coverImage: string;
  readonly projects: readonly WorkProject[];
}
