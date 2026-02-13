#!/bin/bash
# Export NEXT_PUBLIC_API_URL for runtime (though it's build-time only, good for consistency)
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://vendata.com.br}"
# Start Next.js with PORT from environment variable
exec npx next start -p ${PORT:-3001}
