import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import Accordion from '@/components/ui/Accordion';
import { APP_NAME } from '@/utils/constants';
import { clsx } from 'clsx';

/* ═══════════════════════════════════════════════════
   SIZE DATA
   ═══════════════════════════════════════════════════ */

const CATEGORIES = ['Men', 'Women', 'Kids'] as const;
type Category = (typeof CATEGORIES)[number];

interface SizeTable {
  title: string;
  description: string;
  headers: string[];
  rows: string[][];
}

const SIZE_DATA: Record<Category, SizeTable[]> = {
  Men: [
    {
      title: 'Tops & T-Shirts',
      description: 'Body measurements in inches. If you\'re between sizes, we recommend sizing up for a relaxed fit or down for a slim fit.',
      headers: ['Size', 'Chest', 'Waist', 'Length', 'Shoulder'],
      rows: [
        ['XS', '34–36', '28–30', '27', '16.5'],
        ['S', '36–38', '30–32', '28', '17'],
        ['M', '38–40', '32–34', '29', '17.5'],
        ['L', '40–42', '34–36', '30', '18'],
        ['XL', '42–44', '36–38', '31', '18.5'],
        ['XXL', '44–46', '38–40', '32', '19'],
      ],
    },
    {
      title: 'Bottoms & Pants',
      description: 'Waist measurements correspond to trouser waistband. Inseam is measured from the crotch seam to the hem.',
      headers: ['Size', 'Waist', 'Hip', 'Inseam (Regular)', 'Inseam (Short)'],
      rows: [
        ['28', '28', '36', '32', '30'],
        ['30', '30', '38', '32', '30'],
        ['32', '32', '40', '32', '30'],
        ['34', '34', '42', '32', '30'],
        ['36', '36', '44', '32', '30'],
        ['38', '38', '46', '32', '30'],
      ],
    },
    {
      title: 'Shoes',
      description: 'Foot length in centimeters. Measure your foot from heel to toe while standing. If between sizes, go half size up.',
      headers: ['PK/US', 'UK', 'EU', 'Foot Length (cm)'],
      rows: [
        ['7', '6.5', '39⅓', '25.0'],
        ['8', '7.5', '40⅔', '25.5'],
        ['9', '8.5', '42', '26.5'],
        ['10', '9.5', '43⅓', '27.0'],
        ['11', '10.5', '44⅔', '28.0'],
        ['12', '11.5', '46', '29.0'],
      ],
    },
  ],
  Women: [
    {
      title: 'Tops & T-Shirts',
      description: 'Body measurements in inches. For an oversized look, we recommend sizing up one full size.',
      headers: ['Size', 'Bust', 'Waist', 'Length', 'Shoulder'],
      rows: [
        ['XS', '31–33', '24–26', '24', '14'],
        ['S', '33–35', '26–28', '25', '14.5'],
        ['M', '35–37', '28–30', '26', '15'],
        ['L', '37–39', '30–32', '26.5', '15.5'],
        ['XL', '39–41', '32–34', '27', '16'],
        ['XXL', '41–43', '34–36', '27.5', '16.5'],
      ],
    },
    {
      title: 'Bottoms & Pants',
      description: 'Measure your natural waist and fullest part of your hips for the most accurate fit.',
      headers: ['Size', 'Waist', 'Hip', 'Inseam (Regular)', 'Inseam (Short)'],
      rows: [
        ['XS / 24', '24–25', '34–35', '30', '28'],
        ['S / 26', '26–27', '36–37', '30', '28'],
        ['M / 28', '28–29', '38–39', '30', '28'],
        ['L / 30', '30–31', '40–41', '30', '28'],
        ['XL / 32', '32–33', '42–43', '30', '28'],
        ['XXL / 34', '34–35', '44–45', '30', '28'],
      ],
    },
    {
      title: 'Shoes',
      description: 'Foot length in centimeters. We recommend measuring both feet — use the longer foot for sizing.',
      headers: ['PK/US', 'UK', 'EU', 'Foot Length (cm)'],
      rows: [
        ['5', '3.5', '35½', '22.0'],
        ['6', '4.5', '36⅔', '23.0'],
        ['7', '5.5', '38', '24.0'],
        ['8', '6.5', '39⅓', '25.0'],
        ['9', '7.5', '40⅔', '25.5'],
        ['10', '8.5', '42', '26.5'],
      ],
    },
  ],
  Kids: [
    {
      title: 'Tops & T-Shirts',
      description: 'Approximate body measurements by age group. Kids grow fast — when in doubt, size up!',
      headers: ['Size', 'Age', 'Chest', 'Waist', 'Length'],
      rows: [
        ['XS', '4–5 yrs', '22–23', '20–21', '17'],
        ['S', '6–7 yrs', '24–25', '21–22', '19'],
        ['M', '8–9 yrs', '26–27', '22–23', '21'],
        ['L', '10–11 yrs', '28–29', '23–24', '23'],
        ['XL', '12–13 yrs', '30–31', '24–25', '25'],
      ],
    },
    {
      title: 'Shoes',
      description: 'Foot length in centimeters. Leave about 1 cm of room from the longest toe to the front of the shoe.',
      headers: ['PK/US', 'UK', 'EU', 'Foot Length (cm)'],
      rows: [
        ['10K', '9.5K', '27', '16.5'],
        ['11K', '10.5K', '28½', '17.0'],
        ['12K', '11.5K', '30', '18.0'],
        ['13K', '12.5K', '31', '19.0'],
        ['1', '13.5', '32', '20.0'],
        ['2', '1.5', '33½', '21.0'],
        ['3', '2.5', '35', '22.0'],
      ],
    },
  ],
};

const HOW_TO_MEASURE = [
  {
    step: '01',
    title: 'Chest',
    description:
      'Measure around the fullest part of your chest, keeping the tape horizontal under your arms and across your shoulder blades.',
  },
  {
    step: '02',
    title: 'Waist',
    description:
      'Measure around your natural waistline — the narrowest part of your torso, typically just above the navel. Keep the tape snug but not tight.',
  },
  {
    step: '03',
    title: 'Hips',
    description:
      'Stand with feet together and measure around the widest part of your hips and buttocks, keeping the tape level.',
  },
  {
    step: '04',
    title: 'Inseam',
    description:
      'Measure from the crotch seam of a well-fitting pair of pants down to the bottom of the leg. Stand straight for accuracy.',
  },
  {
    step: '05',
    title: 'Foot Length',
    description:
      'Stand on a piece of paper and trace your foot. Measure from the back of the heel to the tip of the longest toe.',
  },
  {
    step: '06',
    title: 'Shoulder',
    description:
      'Measure from the edge of one shoulder to the other, across the back, just below the base of your neck.',
  },
];

const FIT_TIPS = [
  {
    question: 'What if I\'m between sizes?',
    answer:
      'If you\'re between sizes, we recommend going up a size for a more comfortable, relaxed fit. For a closer, athletic fit, stay with the smaller size. Our product pages will note whether a particular item runs large or small.',
  },
  {
    question: 'How should a t-shirt fit?',
    answer:
      'The shoulder seam should sit at the edge of your shoulder — not dropping down your arm or pulling inward. The body should skim your torso without being too tight. The sleeve should hit around mid-bicep, and the hem should reach your hip bone.',
  },
  {
    question: 'Do your shoes run true to size?',
    answer:
      'Our shoes generally run true to size. However, if you have wide feet, we recommend going half a size up for extra comfort. Sneakers can be worn in your regular size, while formal shoes may benefit from half-size up for toe room.',
  },
  {
    question: 'How do I measure my foot at home?',
    answer:
      'Place a piece of paper on a hard floor against a wall. Stand on it with your heel touching the wall. Mark the tip of your longest toe. Measure the distance from the wall to the mark in centimeters. Do this for both feet and use the larger measurement.',
  },
  {
    question: 'What\'s the difference between regular and slim fit?',
    answer:
      'Regular fit provides a classic, comfortable silhouette with room through the body and arms. Slim fit is more tailored and follows the natural line of your body more closely without being restrictive. If you prefer extra room, choose regular fit.',
  },
];

/* ═══════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════ */

function SizeTableSection({ table }: { table: SizeTable }) {
  return (
    <div className="mb-10 last:mb-0">
      <h3 className="text-sm font-heading font-bold uppercase tracking-wider mb-2">
        {table.title}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{table.description}</p>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full px-4 sm:px-0">
          <table className="w-full text-sm border border-gray-200">
            <thead>
              <tr className="bg-brand-black text-white">
                {table.headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-heading font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr
                  key={i}
                  className={clsx(
                    'border-b border-gray-100 transition-colors hover:bg-gray-100',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  )}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={clsx(
                        'px-4 py-3 whitespace-nowrap',
                        j === 0 ? 'font-bold text-brand-black' : 'text-gray-600'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════ */

export default function SizeGuidePage() {
  const [activeTab, setActiveTab] = useState<Category>('Men');

  return (
    <>
      <Helmet>
        <title>Size Guide | {APP_NAME}</title>
        <meta
          name="description"
          content="Find your perfect fit with our comprehensive size guide. Size charts for men's, women's, and kids' clothing and footwear."
        />
      </Helmet>

      {/* ── Hero ── */}
      <section className="bg-brand-black text-white">
        <div className="container-custom py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs mb-6">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-white font-medium">Size Guide</span>
          </nav>

          <h1 className="text-heading-xl md:text-display font-heading uppercase leading-none mb-3">
            Size Guide
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl">
            Find your perfect fit. Use our size charts and measurement tips to choose
            the right size every time.
          </p>
        </div>
      </section>

      {/* ── Category Tabs ── */}
      <section className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="container-custom">
          <div className="flex">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={clsx(
                  'relative px-6 py-4 text-xs font-heading font-bold uppercase tracking-wider transition-colors',
                  activeTab === cat
                    ? 'text-brand-black'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {cat}
                {activeTab === cat && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-black" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Size Tables ── */}
      <section className="container-custom py-12 md:py-16">
        <div className="max-w-4xl">
          <h2 className="text-heading font-heading uppercase mb-1">
            {activeTab}&apos;s Sizing
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            All measurements are in inches unless otherwise noted.
          </p>

          {SIZE_DATA[activeTab].map((table, i) => (
            <SizeTableSection key={`${activeTab}-${i}`} table={table} />
          ))}
        </div>
      </section>

      {/* ── How to Measure ── */}
      <section className="bg-gray-50">
        <div className="container-custom py-12 md:py-16">
          <h2 className="text-heading font-heading uppercase mb-2">
            How to Measure
          </h2>
          <p className="text-sm text-gray-500 mb-10 max-w-xl">
            Use a soft measuring tape for the most accurate results. Wear light
            clothing or measure over undergarments only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOW_TO_MEASURE.map((item) => (
              <div
                key={item.step}
                className="bg-white border border-gray-200 p-6 hover:border-brand-black transition-colors"
              >
                <span className="text-display-lg font-heading font-black text-gray-100 leading-none select-none">
                  {item.step}
                </span>
                <h3 className="text-sm font-heading font-bold uppercase tracking-wider -mt-4 mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fit Tips ── */}
      <section className="container-custom py-12 md:py-16">
        <div className="max-w-3xl">
          <h2 className="text-heading font-heading uppercase mb-2">
            Fit Tips & FAQ
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Common questions about sizing and fit.
          </p>

          {FIT_TIPS.map((tip) => (
            <Accordion key={tip.question} title={tip.question}>
              <p className="text-sm text-gray-600 leading-relaxed">
                {tip.answer}
              </p>
            </Accordion>
          ))}
          <div className="border-t border-gray-200" />
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-brand-black">
        <div className="container-custom py-12 md:py-16 text-center">
          <h2 className="text-heading-lg md:text-heading-xl font-heading uppercase text-white mb-3">
            Still Not Sure?
          </h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Our team is here to help you find the perfect fit. Reach out and
            we&apos;ll guide you through.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center border-2 border-white text-white px-10 py-4 font-heading font-bold uppercase text-xs tracking-wider hover:bg-white hover:text-brand-black transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  );
}
