release: npx prisma migrate deploy && node prisma/setup-super-admin.js
web: next start -H 0.0.0.0 -p ${PORT:-3000}
