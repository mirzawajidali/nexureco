import { Fragment } from 'react';

/** A post title where words like "T-Shirt" stay on one line instead of breaking after the hyphen */
export default function TitleText({ title }: { title: string }) {
  return (
    <>
      {title.split(' ').map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          {word.includes('-') ? <span className="whitespace-nowrap">{word}</span> : word}
        </Fragment>
      ))}
    </>
  );
}
