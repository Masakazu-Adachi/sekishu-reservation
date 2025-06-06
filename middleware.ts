import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const basicAuth = request.headers.get('authorization')
    const validUser = process.env.ADMIN_USER || 'sekishuu'
    const validPass = process.env.ADMIN_PASS || '16731227'

    if (basicAuth) {
      const [scheme, encoded] = basicAuth.split(' ')
      if (scheme === 'Basic' && encoded) {
        const decoded = atob(encoded)
        const [user, pass] = decoded.split(':')
        if (user === validUser && pass === validPass) {
          return NextResponse.next()
        }
      }
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
