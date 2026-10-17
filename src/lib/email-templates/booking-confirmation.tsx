import * as React from 'react'
import { Body, Container, Head, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface BookingConfirmationProps {
  subject?: string; accent?: string; workshop?: string; tag?: string; headline?: string; hi?: string
  rows?: { k: string; v: string }[]; tip?: string; cta?: string; link?: string; bye?: string; lang?: string
}

const JACKIE_ORANGE = '#f26b1d'
const ink = '#1f1d1b', muted = '#8a8580', line = '#efeae4'
const font = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const Email = ({ accent = JACKIE_ORANGE, workshop = 'AutoJackie', tag = 'Jackie booked you in', headline = 'Your drop-off time is booked.', hi = 'Hi,', rows = [], tip = '', cta = 'Open My visits', link = 'https://auto-jackie.lovable.app', bye = 'See you soon!', lang = 'en' }: BookingConfirmationProps) => (
  <Html lang={lang} dir="ltr">
    <Head />
    <Preview>{headline}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: font, margin: 0, padding: '28px 12px', color: ink }}>
      <Container style={{ maxWidth: 480, borderTop: `3px solid ${accent}`, paddingTop: 22 }}>
        <table role="presentation"><tbody><tr>
          <td style={{ width: 26, height: 26, background: accent, borderRadius: 7, textAlign: 'center', verticalAlign: 'middle', color: '#ffffff', fontWeight: 800, fontSize: 14 }}>J</td>
          <td style={{ paddingLeft: 10, fontSize: 14, fontWeight: 600, color: ink }}>{workshop}</td>
        </tr></tbody></table>
        <Text style={{ margin: '26px 0 0', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>{tag}</Text>
        <Text style={{ margin: '6px 0 18px', fontSize: 20, fontWeight: 600, lineHeight: '1.3', color: ink }}>{headline}</Text>
        <Text style={{ margin: '0 0 10px', fontSize: 14, color: ink }}>{hi}</Text>
        <Section style={{ borderTop: `1px solid ${line}` }}>
          {rows.filter(r => r.v).map(r => (
            <table key={r.k} role="presentation" style={{ width: '100%', borderBottom: `1px solid ${line}` }}><tbody><tr>
              <td style={{ padding: '9px 0', color: muted, fontSize: 12, width: 96 }}>{r.k}</td>
              <td style={{ padding: '9px 0', fontSize: 14, color: ink, fontWeight: 600 }}>{r.v}</td>
            </tr></tbody></table>
          ))}
        </Section>
        {tip && <Text style={{ margin: '18px 0', fontSize: 13, color: '#5a5550', lineHeight: '1.55' }}>{tip}</Text>}
        <Link href={link} style={{ display: 'inline-block', border: `1px solid ${accent}`, color: accent, fontWeight: 600, fontSize: 13, padding: '8px 16px', borderRadius: 999, textDecoration: 'none' }}>{cta} →</Link>
        <Text style={{ margin: '28px 0 0', paddingTop: 14, borderTop: `1px solid ${line}`, color: muted, fontSize: 11 }}>{bye} · <span style={{ color: JACKIE_ORANGE, fontWeight: 700 }}>AutoJackie</span></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => (typeof d['subject'] === 'string' && d['subject']) || 'Your visit is booked',
  displayName: 'Booking confirmation',
  previewData: { workshop: 'Demo Verkstad', hi: 'Hi Ana,', rows: [{ k: 'Drop-off', v: 'Monday 20 October, 08:00' }, { k: 'Job', v: 'Brake pads, front' }, { k: 'Car', v: 'Volvo V70' }], tip: 'Bring your car, your key and nothing to worry about.' },
} satisfies TemplateEntry
