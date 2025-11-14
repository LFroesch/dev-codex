# California Tax & EIN Guide for Dev Codex (Stripe SaaS)

## TL;DR - What You Need to Know

**Good news:** California does NOT charge sales tax on SaaS subscriptions.

**Key decisions:**
1. **Business Structure:** Sole Proprietor vs LLC
2. **Tax ID:** EIN vs SSN for Stripe
3. **Tax Obligations:** What you actually need to pay

---

## 1. Do You Need an EIN?

### You NEED an EIN if:
- ✅ You form an LLC (required for LLCs)
- ✅ You have employees (required)
- ✅ You file employment, excise, or alcohol/tobacco/firearms tax returns
- ✅ You want to separate personal and business finances (recommended)
- ✅ You want stronger privacy (EIN doesn't expose your SSN)

### You CAN use your SSN if:
- ⚠️ You're a sole proprietor with no employees
- ⚠️ You don't mind exposing your SSN to Stripe and customers
- ⚠️ You're okay mixing personal and business income reporting

### **Recommendation: Get an EIN**
Even as a sole proprietor, getting an EIN is:
- **Free** (apply at IRS.gov, instant approval)
- **Private** (protects your SSN)
- **Professional** (looks more legitimate)
- **Future-proof** (you'll need it if you hire anyone)

**How to get one:** https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online

---

## 2. Sole Proprietor vs LLC in California

| Factor | Sole Proprietor | California LLC |
|--------|----------------|----------------|
| **Startup Cost** | ~$50-100 (DBA filing) | $70 filing fee |
| **Annual Cost** | $0 (just income taxes) | **$800/year minimum franchise tax** |
| **Liability** | ❌ Personally liable for debts/lawsuits | ✅ Personal assets protected |
| **Taxes** | Schedule C on personal return | Same (disregarded entity) OR elect S-Corp |
| **Stripe Setup** | Can use SSN or EIN | Must use EIN |
| **Credibility** | Lower | Higher |
| **Best For** | Testing/side projects | Serious businesses, any revenue risk |

### **The $800 Question**

California LLCs pay $800/year **even with $0 revenue**. This is a big deal if you're:
- Just starting out
- Testing product-market fit
- Making less than $5-10k/year

**Recommendation:**
- **Revenue < $10k/year:** Start as sole proprietor, convert to LLC later
- **Revenue > $10k/year:** Form an LLC for liability protection
- **High-risk business:** LLC from day 1 (protects personal assets)

---

## 3. California SaaS Sales Tax (The Easy Part)

### ✅ You DO NOT Need to Collect Sales Tax

**Why?** California does NOT tax SaaS because:
- It's delivered electronically (no tangible property)
- No physical media changes hands (no CD, USB drive, etc.)
- Regulation 1502 exempts remote software access

**Exception:** If you sell physical goods alongside your SaaS (like a USB drive or printed manual), THEN you need to charge sales tax on those items.

**No nexus threshold worries** unless you hit $500k+ annually (at which point, hire a tax professional).

---

## 4. What Taxes You DO Pay in California

### Federal Taxes (All Business Types)
- **Self-Employment Tax:** 15.3% on net profit (Social Security + Medicare)
- **Income Tax:** 10-37% on net profit (your tax bracket)
- **Quarterly Estimated Payments:** Required if you owe >$1,000/year

### California State Taxes

**If Sole Proprietor:**
- State income tax: 1-13.3% on net profit
- No separate business tax (flows through Schedule C)

**If LLC:**
- Same state income tax (1-13.3%)
- **PLUS $800/year minimum franchise tax** (even at $0 revenue)
- Fee on gross revenue if over $250k:
  - $250k-$499k: $900
  - $500k-$999k: $2,500
  - $1M-$4.99M: $6,000
  - $5M+: $11,790

---

## 5. Stripe Tax Reporting

### What Stripe Reports to the IRS

**1099-K Threshold (2025):**
- Stripe sends you a 1099-K if you process **$5,000+ in 2025**
- (This threshold was $20k previously, lowered to $600 in 2024, raised to $5k for 2025)

### What You Report

**Sole Proprietor:**
- Report all revenue on **Schedule C** (Form 1040)
- Deduct business expenses
- Pay self-employment tax on net profit

**LLC (default disregarded entity):**
- Same as sole proprietor (Schedule C)
- The LLC is "ignored" for tax purposes

**LLC (S-Corp election):**
- Pay yourself a "reasonable salary" (subject to payroll taxes)
- Take remaining profit as distributions (no self-employment tax)
- Saves ~15% on self-employment tax, but requires payroll processing
- Only worth it if profit > $60k/year

---

## 6. Recommended Setup for Dev Codex

### If You're Just Starting (Revenue < $10k/year):

1. **Business Structure:** Sole Proprietor
2. **Tax ID:** Get an EIN (free, protects SSN)
3. **Stripe:** Use EIN for account setup
4. **Sales Tax:** None required (SaaS exempt)
5. **Quarterly Taxes:** Set aside 25-30% of profit for taxes
6. **Convert to LLC:** When revenue hits $10-15k or you want liability protection

### If You Have Traction (Revenue > $10k/year):

1. **Business Structure:** California LLC
2. **Tax ID:** EIN (required for LLC)
3. **Stripe:** Use LLC EIN
4. **Bank Account:** Separate business checking (recommended)
5. **Accounting:** Use QuickBooks or Wave (free)
6. **Quarterly Taxes:** Set aside 30-35% of profit
7. **Annual Costs:** Budget for $800 franchise tax + ~$500 for tax prep

---

## 7. Action Items

### Immediate (This Week):
- [ ] **Get an EIN** - https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online (takes 5 minutes)
- [ ] **Decide on business structure** (sole prop vs LLC based on revenue)
- [ ] **Set up Stripe** with EIN (not SSN)

### Within 30 Days:
- [ ] Open separate business bank account (even as sole prop)
- [ ] Set up accounting software (Wave is free, QuickBooks is $30/mo)
- [ ] Create system for tracking expenses (receipts, mileage, etc.)
- [ ] Calculate quarterly estimated tax payments if needed

### Quarterly:
- [ ] Pay estimated taxes (if you owe >$1,000 for the year)
  - Federal: https://www.irs.gov/payments
  - California: https://www.ftb.ca.gov/pay/index.html
- [ ] Review profit/loss, adjust tax withholding if needed

### Annually:
- [ ] File Schedule C (sole prop) or LLC tax return
- [ ] Pay $800 CA franchise tax if LLC (due by April 15)
- [ ] Send 1099s to contractors (if you hired any)

---

## 8. When to Hire a Tax Professional

**DIY is fine if:**
- Revenue < $50k/year
- Simple business (just SaaS subscriptions)
- No employees or contractors
- Comfortable with TurboTax/FreeTaxUSA

**Hire a CPA if:**
- Revenue > $50k/year
- You have employees
- You're considering S-Corp election
- Complex deductions (home office, equipment, travel)
- You want to minimize audit risk

**Cost:** $500-1,500/year for basic business tax prep in California

---

## 9. Common Mistakes to Avoid

❌ **Not setting aside money for taxes** (set aside 30% of every payment)
❌ **Mixing personal and business expenses** (get separate bank account)
❌ **Missing quarterly estimated payments** (triggers penalties)
❌ **Forming an LLC too early** (don't pay $800/year if revenue is tiny)
❌ **Using SSN instead of EIN with Stripe** (privacy risk)
❌ **Not tracking deductible expenses** (leaving money on the table)
❌ **Collecting sales tax on SaaS** (California doesn't require it)

---

## 10. Helpful Resources

**IRS:**
- Apply for EIN: https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- Small Business Tax Center: https://www.irs.gov/businesses/small-businesses-self-employed

**California:**
- Franchise Tax Board: https://www.ftb.ca.gov/
- Secretary of State (LLC filing): https://www.sos.ca.gov/
- Sales Tax (CDTFA): https://www.cdtfa.ca.gov/

**Stripe:**
- Tax Documentation: https://stripe.com/docs/tax
- Connect Identity Verification: https://docs.stripe.com/connect/identity-verification

**Free Tools:**
- Wave Accounting (free): https://www.waveapps.com/
- FreeTaxUSA (cheap tax filing): https://www.freetaxusa.com/
- QuickBooks Self-Employed: https://quickbooks.intuit.com/self-employed/

---

## Summary

**For Dev Codex in California:**
1. ✅ **No sales tax** on SaaS subscriptions
2. ✅ **Get an EIN** (free, instant, protects SSN)
3. ⚠️ **LLC costs $800/year** - only worth it if revenue > $10k or liability concerns
4. ✅ **Set aside 30% of profit** for federal + state income taxes
5. ✅ **Pay quarterly estimated taxes** to avoid penalties
6. ✅ **Keep business and personal finances separate**

**Most important:** Don't overthink it. Start simple (sole prop + EIN), stay compliant with quarterly taxes, and upgrade to LLC when it makes financial sense.
