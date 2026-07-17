# ♿ Accessibility Audit Violations (Total Rules Failed: 1)

---

## 🛑 [color-contrast] Elements must meet minimum color contrast ratio thresholds
- **Severity**: serious
- **Description**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Learn More**: [Deque University Link](https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=playwright)

### Affected Elements:

#### Element 1
- **Selector**: `.gap-2.items-center.flex > p`
- **HTML Snippet**:
  ```html
  <p class="text-sm text-muted-foreground">Selected: <span class="font-medium text-foreground">3</span> of 63</p>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.76 (foreground color: #6c7075, background color: #0f1218, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 2
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(1) > .space-y-1.flex-1.min-w-0 > .flex-wrap.gap-1.flex > .bg-muted.px-1\.5.py-0\.5:nth-child(1)`
- **HTML Snippet**:
  ```html
  <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">export-tag-1784291050606-2c476d-3-1</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.33 (foreground color: #6e7277, background color: #1d2127, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 3
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(1) > .space-y-1.flex-1.min-w-0 > .flex-wrap.gap-1.flex > .bg-muted.px-1\.5.py-0\.5:nth-child(2)`
- **HTML Snippet**:
  ```html
  <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">export-tag-1784291050606-2c476d-3-2</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.33 (foreground color: #6e7277, background color: #1d2127, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 4
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(2) > .space-y-1.flex-1.min-w-0 > .flex-wrap.gap-1.flex > .bg-muted.px-1\.5.py-0\.5:nth-child(1)`
- **HTML Snippet**:
  ```html
  <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">export-tag-1784291050606-2c476d-2-1</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.33 (foreground color: #6e7277, background color: #1d2127, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 5
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(2) > .space-y-1.flex-1.min-w-0 > .flex-wrap.gap-1.flex > .bg-muted.px-1\.5.py-0\.5:nth-child(2)`
- **HTML Snippet**:
  ```html
  <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">export-tag-1784291050606-2c476d-2-2</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.33 (foreground color: #6e7277, background color: #1d2127, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 6
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(3) > .space-y-1.flex-1.min-w-0 > .justify-between.gap-2.items-center > .whitespace-nowrap`
- **HTML Snippet**:
  ```html
  <span class="text-xs text-muted-foreground whitespace-nowrap shrink-0">7/17/2026</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.5 (foreground color: #6e7277, background color: #151e1e, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 7
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(3) > .space-y-1.flex-1.min-w-0 > .flex-wrap.gap-1.flex > .bg-muted.px-1\.5.py-0\.5:nth-child(1)`
- **HTML Snippet**:
  ```html
  <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">export-tag-1784291050606-2c476d-1-1</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.33 (foreground color: #6e7277, background color: #1d2127, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 8
- **Selector**: `.border-primary.bg-primary\/5.dark\:bg-primary\/10:nth-child(3) > .space-y-1.flex-1.min-w-0 > .flex-wrap.gap-1.flex > .bg-muted.px-1\.5.py-0\.5:nth-child(2)`
- **HTML Snippet**:
  ```html
  <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">export-tag-1784291050606-2c476d-1-2</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.33 (foreground color: #6e7277, background color: #1d2127, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 9
- **Selector**: `.justify-end > .text-primary-foreground.hover\:bg-primary\/90.bg-primary`
- **HTML Snippet**:
  ```html
  <button class="inline-flex items-ce...">
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 3.64 (foreground color: #060908, background color: #38763d, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 10
- **Selector**: `#radix-_r_a_`
- **HTML Snippet**:
  ```html
  <h2 id="radix-_r_a_" class="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 2.59 (foreground color: #54565c, background color: #0d1015, font size: 13.5pt (18px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 11
- **Selector**: `#radix-_r_b_`
- **HTML Snippet**:
  ```html
  <p id="radix-_r_b_" class="text-sm text-muted-foreground">File is ready to download.</p>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 1.74 (foreground color: #393d43, background color: #0d1015, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 12
- **Selector**: `.justify-between.text-sm.flex > span:nth-child(1)`
- **HTML Snippet**:
  ```html
  <span class="text-muted-foreground">Notes</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 1.74 (foreground color: #393d43, background color: #0d1015, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 13
- **Selector**: `.justify-between.text-sm.flex > .font-medium`
- **HTML Snippet**:
  ```html
  <span class="font-medium">3 of 3</span>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 2.64 (foreground color: #55585d, background color: #0e1117, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 14
- **Selector**: `.text-primary`
- **HTML Snippet**:
  ```html
  <div class="text-center text-sm font-semibold text-primary">100%</div>
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 1.7 (foreground color: #24422c, background color: #0e1117, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

#### Element 15
- **Selector**: `.flex-col-reverse > .text-primary-foreground.hover\:bg-primary\/90.bg-primary`
- **HTML Snippet**:
  ```html
  <button class="inline-flex items-ce...">
  ```
- **How to Fix**:
  > [!TIP]
  > Fix any of the following:
  >   Element has insufficient color contrast of 1.64 (foreground color: #0d0f13, background color: #203f27, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

---
