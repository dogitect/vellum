// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { UiStateService } from './ui-state.service';

describe('UiStateService', () => {
  let service: UiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiStateService],
    });
    service = TestBed.inject(UiStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have navigationHidden signal initialized to false', () => {
    expect(service.navigationHidden()).toBe(false);
  });

  describe('hideNavigation', () => {
    it('should set navigationHidden to true', () => {
      service.hideNavigation();
      expect(service.navigationHidden()).toBe(true);
    });
  });

  describe('showNavigation', () => {
    it('should set navigationHidden to false', () => {
      service.hideNavigation();
      expect(service.navigationHidden()).toBe(true);

      service.showNavigation();
      expect(service.navigationHidden()).toBe(false);
    });
  });

  it('should toggle navigation visibility correctly', () => {
    expect(service.navigationHidden()).toBe(false);

    service.hideNavigation();
    expect(service.navigationHidden()).toBe(true);

    service.showNavigation();
    expect(service.navigationHidden()).toBe(false);

    service.hideNavigation();
    expect(service.navigationHidden()).toBe(true);
  });
});
