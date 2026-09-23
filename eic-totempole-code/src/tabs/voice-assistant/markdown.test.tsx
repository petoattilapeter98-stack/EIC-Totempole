import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown';

function renderMd(text: string) {
  return render(<div data-testid="root">{renderMarkdown(text)}</div>);
}

describe('renderMarkdown', () => {
  it('renders a plain paragraph as-is', () => {
    renderMd('Just a plain sentence with no formatting.');
    expect(screen.getByText('Just a plain sentence with no formatting.')).toBeInTheDocument();
  });

  it('renders **bold** as strong text', () => {
    const { container } = renderMd('This is **very important**.');
    expect(container.querySelector('strong')?.textContent).toBe('very important');
  });

  it('renders *italic* and _italic_ as emphasis', () => {
    const { container } = renderMd('One *word* and _another_.');
    const em = container.querySelectorAll('em');
    expect(Array.from(em).map((e) => e.textContent)).toEqual(['word', 'another']);
  });

  it('renders `code` as an inline code element', () => {
    const { container } = renderMd('Run `npm install` first.');
    expect(container.querySelector('code')?.textContent).toBe('npm install');
  });

  it('renders bullet lines starting with "•" as a real list', () => {
    const { container } = renderMd('Intro line.\n\n• First item\n\n• Second item');
    const items = container.querySelectorAll('ul > li');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe('First item');
    expect(items[1]?.textContent).toBe('Second item');
  });

  it('renders "-" and "*" bullet lines as a list too', () => {
    const { container } = renderMd('- one\n- two\n- three');
    expect(container.querySelectorAll('ul > li')).toHaveLength(3);
  });

  it('renders numbered lines as an ordered list', () => {
    const { container } = renderMd('1. First step\n2. Second step');
    const items = container.querySelectorAll('ol > li');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe('First step');
  });

  it('renders an explicit markdown link as a real anchor', () => {
    const { container } = renderMd('See [our site](https://example.com/page) for more.');
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com/page');
    expect(link?.textContent).toBe('our site');
  });

  it('hides a citation reference-definition line and shows only the marker', () => {
    const { container } = renderMd(
      'The programme runs quarterly[1].\n\n[1]: cite:1 "EIC Presentation - Raw data .docx"',
    );
    // The raw definition line must never appear as visible text.
    expect(screen.queryByText(/cite:1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/EIC Presentation - Raw data/)).not.toBeInTheDocument();
    // The inline marker survives as a small, non-link citation mark.
    const sup = container.querySelector('sup');
    expect(sup?.textContent).toBe('[1]');
    expect(container.querySelector('a')).not.toBeInTheDocument();
  });

  it('renders a real http(s) reference link as a clickable anchor', () => {
    const { container } = renderMd('Read the docs[1].\n\n[1]: https://example.com/docs "Docs"');
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com/docs');
    expect(link?.textContent).toBe('1');
  });

  it('renders the actual live-agent response sample correctly (captured 2026-09-23)', () => {
    // Captured verbatim from the deployed Copilot Studio agent so this test
    // exercises the exact shape it produces, not a guessed approximation.
    const sample = `Based on the EIC presentation document, the Budapest European Innovation Center runs or supports several structured programmes focused on onboarding, learning, leadership, innovation, and employee development[1].

• TEKsystems Onboarding Programme – A professional onboarding programme that helps new employees integrate into the organisation and become productive quickly[1].

• Dedicated EIC Onboarding Pathway – An EIC-specific onboarding experience tailored to the Innovation Centre's ways of working, culture, and delivery model[1].

• RISE Programme – A nomination-based development programme that includes Harrison Assessments, professional coaching, and cross-functional collaboration opportunities[1].

In addition, all employees maintain an Individual Development Plan (IDP), which serves as an ongoing framework for career planning, development goals, coaching, and progress tracking[1].

[1]: cite:1 "EIC%20Presentation%20-%20Raw%20data%20.docx"`;

    const { container } = renderMd(sample);

    expect(container.querySelectorAll('ul > li')).toHaveLength(3);
    expect(screen.getByText(/TEKsystems Onboarding Programme/)).toBeInTheDocument();
    // The raw reference-definition footer must not leak into visible text.
    expect(screen.queryByText(/cite:1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/%20/)).not.toBeInTheDocument();
    // Two intro/closing paragraphs around the list.
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });
});
