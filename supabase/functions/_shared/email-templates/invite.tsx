/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous avez été invité à rejoindre {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logoText}>{siteName}</Text>
        <Hr style={divider} />
        <Heading style={h1}>Vous avez été invité</Heading>
        <Text style={text}>
          Vous avez été invité à rejoindre{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Cliquez sur le bouton ci-dessous pour accepter l'invitation et
          créer votre compte.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accepter l'invitation
        </Button>
        <Hr style={divider} />
        <Text style={footer}>
          Si vous n'attendiez pas cette invitation, ignorez cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: 'hsl(210, 20%, 98%)',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = {
  maxWidth: '520px',
  margin: '40px auto',
  backgroundColor: 'hsl(0, 0%, 100%)',
  borderRadius: '0.625rem',
  padding: '36px 40px',
  border: '1px solid hsl(214, 32%, 91%)',
}
const logoText = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 40%)',
  margin: '0 0 4px',
}
const divider = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 16%, 47%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: 'hsl(217, 91%, 40%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(217, 91%, 40%)',
  color: 'hsl(0, 0%, 100%)',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '0.625rem',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 60%)', margin: '0' }
