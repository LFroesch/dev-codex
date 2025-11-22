#!/bin/bash
# Comprehensive auth audit script

echo "=== AUDIT: Routes that need auth but might be missing it ==="
echo ""

echo "1. Routes with requireProjectAccess but NO requireAuth:"
grep -n "router\.\(post\|put\|patch\|delete\)" backend/src/routes/projects.ts | grep "requireProjectAccess" | grep -v "requireAuth" | wc -l
echo "   Found above routes"
echo ""

echo "2. Routes with requireAdmin but NO requireAuth:"
grep -rn "router\.\(post\|put\|patch\|delete\)" backend/src/routes/ | grep "requireAdmin" | grep -v "requireAuth" | wc -l
echo "   Found above routes"
echo ""

echo "3. All POST/PUT/PATCH/DELETE routes without ANY auth middleware:"
for file in backend/src/routes/*.ts; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    # Skip base routes and health
    if [[ "$filename" != "base.ts" && "$filename" != "health.ts" && "$filename" != "auth.ts" && "$filename" != "public.ts" ]]; then
      suspicious=$(grep -n "router\.\(post\|put\|patch\|delete\)" "$file" | grep -v "requireAuth\|requireAdmin\|requireProjectAccess" | grep -v "^$")
      if [ ! -z "$suspicious" ]; then
        echo "   $filename:"
        echo "$suspicious" | head -5
      fi
    fi
  fi
done
echo ""

echo "=== DETAILED: projects.ts routes missing requireAuth ==="
grep -n "router\.\(post\|put\|patch\|delete\)" backend/src/routes/projects.ts | grep "requireProjectAccess" | grep -v "requireAuth"
