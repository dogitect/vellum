// Copyright 2025 Leon Xia. MIT License.

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SeoService } from '../../core/services';

/** Contact page with form and mailto submission. */
@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.setContactSeo();
  }

  protected readonly isSubmitting = signal(false);
  protected readonly isSubmitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hasValidationError = signal(false);

  protected readonly contactForm: FormGroup = this.fb.group({
    fullName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    projectInfo: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  protected onInputChange(): void {
    if (this.hasValidationError()) {
      this.hasValidationError.set(false);
    }
  }

  protected onSubmit(): void {
    if (this.contactForm.invalid) {
      this.hasValidationError.set(true);
      return;
    }

    this.isSubmitting.set(true);
    this.hasValidationError.set(false);
    this.errorMessage.set(null);

    const { fullName, email, projectInfo } = this.contactForm.value;

    const subject = encodeURIComponent(`Contact from ${fullName}`);
    const body = encodeURIComponent(
      `Name: ${fullName}\nEmail: ${email}\n\nProject Info:\n${projectInfo}`
    );
    const mailtoUrl = `mailto:leonxia@dogitect.io?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;

    this.isSubmitting.set(false);
    this.isSubmitted.set(true);
    this.contactForm.reset();
  }
}
