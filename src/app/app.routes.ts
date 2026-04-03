// Copyright 2025 Leon Xia. MIT License.

import { Routes, ResolveFn } from '@angular/router';

// Provides an initial readable title for work-detail routes before data loads.
const workDetailTitleResolver: ResolveFn<string> = (route) => {
  const slug = route.paramMap.get('slug') ?? '';
  if (!slug) return 'Works | Vellum';
  const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return `${label} | Vellum`;
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Vellum by Dogitect — Crafting clarity on stage',
    children: [],
  },
  {
    path: 'works',
    loadComponent: () =>
      import('./features/works/works').then((m) => m.WorksComponent),
    title: 'Works | Vellum',
  },
  {
    path: 'works/:slug',
    loadComponent: () =>
      import('./features/work-detail').then((m) => m.WorkDetailComponent),
    title: workDetailTitleResolver,
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about').then((m) => m.AboutComponent),
    title: 'About | Vellum',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact').then((m) => m.ContactComponent),
    title: 'Contact | Vellum',
  },
  {
    path: 'solutions',
    redirectTo: 'works',
    pathMatch: 'full',
  },
  {
    path: 'solutions/:slug',
    redirectTo: 'works/:slug',
    pathMatch: 'full',
  },
  {
    path: 'solution',
    redirectTo: 'works',
    pathMatch: 'full',
  },
  {
    path: 'showcase',
    redirectTo: 'works',
    pathMatch: 'full',
  },
  {
    path: 'project/:slug',
    redirectTo: 'works',
    pathMatch: 'full',
  },
  {
    path: 'blog',
    redirectTo: 'works',
    pathMatch: 'full',
  },
  {
    path: 'blog/:slug',
    redirectTo: 'works',
    pathMatch: 'full',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
    title: '404 | Vellum',
  },
];
