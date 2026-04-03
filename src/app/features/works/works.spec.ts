// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorksComponent } from './works';

describe('WorksComponent', () => {
  let component: WorksComponent;
  let fixture: ComponentFixture<WorksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorksComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty work items initially (loaded via HTTP)', () => {
    const workItems = component['workItems']();
    expect(workItems.length).toBe(0);
  });

  it('should have zero totalWorks initially', () => {
    expect(component['totalWorks']()).toBe(0);
  });

  it('should start with activeIndex 0', () => {
    expect(component['activeIndex']()).toBe(0);
  });
});
