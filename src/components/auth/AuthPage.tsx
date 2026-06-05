import { useState } from 'react'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { ForgotPasswordPage } from './ForgotPasswordPage'

type AuthView = 'login' | 'register' | 'forgot-password'

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login')
  
  switch (view) {
    case 'login':
      return (
        <LoginPage
          onSwitchToRegister={() => setView('register')}
          onSwitchToForgotPassword={() => setView('forgot-password')}
        />
      )
    case 'register':
      return (
        <RegisterPage
          onSwitchToLogin={() => setView('login')}
        />
      )
    case 'forgot-password':
      return (
        <ForgotPasswordPage
          onSwitchToLogin={() => setView('login')}
        />
      )
    default:
      return null
  }
}
