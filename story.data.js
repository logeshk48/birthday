/* ============================================================
   THE STORY — CONTENT ONLY
   ============================================================

   This is the ONLY file you edit to change the story.

   There are FOUR pages:

     PAGE 1   How it started   -> two photos, two little stories
     PAGE 2   Special moments  -> the videos
     PAGE 3   Us               -> the three photos
     PAGE 4   Happy Birthday   -> the wish

   Each page except the last has a `next:` line. That is the
   word on the button that carries her to the next page --
   change it to anything you like.

   ------------------------------------------------------------
   WHERE THE FILES GO
   ------------------------------------------------------------

   Put every photo and video inside:      public/story/

   Then write the path here WITHOUT the word "public":

       src: 'story/01-instagram.jpg'

   Names are case sensitive on the live site. 01-Instagram.jpg
   will NOT match 01-instagram.jpg once it is deployed, even
   though it works on Windows. Keep everything lowercase.

   ------------------------------------------------------------
   TEXT BLOCKS
   ------------------------------------------------------------

       { p:     'a normal paragraph' }
       { note:  'a highlighted line, like a notification' }
       { small: 'a quieter aside, in smaller text' }

   If a photo or video is missing, that slot shows a soft
   placeholder instead of breaking. You can add it later.
   ============================================================ */


/* ============================================================
   PAGE 1 — HOW IT STARTED
   Two photos, each with its own story, on one page.
   ============================================================ */

export const PAGE_ONE = {

  kicker: 'where it began',

  title: 'How We Started 💕',

  /* the word on the button that moves to the next page */

  next: 'and then…',

  parts: [

    {
      heading: 'How It All Started',

      media: {
        type: 'image',
        src: 'story/01-instagram.jpg',
        alt: 'That Instagram request',
      },

      blocks: [
        { p: 'I sent you that Instagram request on 23rd July…' },

        { p: 'Then you simply accepted the request, but you didn\u2019t follow me back. 😂' },

        { p: 'And then came 24th July, around 6:30 PM, I think.' },

        { p: 'I was outside when the notification suddenly popped up —' },

        { note: 'started following you' },

        { p: 'At that moment, I had the biggest smile ever 😭❤️' },

        { p: 'I literally wanted to jump with happiness… but my dad was right there, so I had to control myself. 😂😂' },
      ],
    },

    {
      heading: 'How I Met You ❤️',

      media: {
        type: 'image',
        src: 'story/02-rangoli.jpg',
        alt: 'The Rangoli function',
      },

      blocks: [
        { p: 'I saw you for the first time at that Rangoli function.' },

        { p: 'I didn\u2019t know that this small moment would become the beginning of such a beautiful story. ❤️' },

        { small: 'And that\u2019s how I met you for the first time… without knowing how special you would become to me later.' },
      ],
    },

  ],
};


/* ============================================================
   PAGE 2 — SPECIAL MOMENTS
   The videos. Add or remove items from `clips` freely.
   ============================================================ */

export const PAGE_TWO = {

  kicker: 'the bits I kept',

  title: 'Special Moments 🎥',

  next: 'there’s more',

  intro: [
    { p: 'Some moments are too good to keep only in my head.' },

    { small: 'Tap any video to hear it.' },
  ],

  clips: [

    {
      src: 'story/04-clip.mp4',
      caption: 'Write about this one',
    },

    {
      src: 'story/05-clip.mp4',
      caption: 'And this one',
    },

    {
      src: 'story/06-clip.mp4',
      caption: 'This one too',
    },

    {
      src: 'story/07-clip.mp4',
      caption: 'And my favourite',
    },

  ],

  outro: [
    { p: 'Every one of these made an ordinary day better. ❤️' },
  ],
};


/* ============================================================
   PAGE 3 — THE THREE PHOTOS
   Just the pictures. The wish gets its own page after this.
   ============================================================ */

export const PAGE_THREE = {

  kicker: 'a few favourites',

  title: '🌸',

  photos: [
    { src: 'story/final-1.jpg', alt: 'A favourite photo' },
    { src: 'story/final-2.jpg', alt: 'Another favourite' },
    { src: 'story/final-3.jpg', alt: 'One more' },
  ],

  blocks: [
    { small: 'Three of the ones I keep going back to.' },
  ],

  next: 'one last thing',
};


/* ============================================================
   PAGE 4 — THE BIRTHDAY WISH
   ============================================================ */

export const FINALE = {

  eyebrow: '18 August 2026',

  title: 'Happy Birthday',

  name: 'Pavi',

  blocks: [
    { p: 'Wishing you a year of quiet joys and loud, ridiculous laughter.' },

    { p: 'Thank you for every small moment so far. ❤️' },
  ],

  signoff: 'Have an amazing year ahead ♡',

  close: 'Back to the tree',
};