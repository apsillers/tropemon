# Tropemon

## What?

In terms of structure, this is a web application that accepts input as HTTP requests (which are sent by clicking links) and that renders output as JPEGs sent on a `multipart/x-mixed-replace` stream supplied to an `<img>` element.

In terms of substance, it is a fanfiction-themed pardoy of the Pokémon video game series.

## How?

The overall approach is documented in my [2021 !!Con talk, Night of the living GIF](https://www.youtube.com/watch?v=GJa6eD7tFbY). Improvements over the approach there are:
  * instead of an infinite GIF, use `x-mixed-replace` to stream a series of JPEGs to a single `<img>`
  * instead of `3xx` redirects to bounce the user back to the page, use `204 No Content` responses to ensure the user doesn't leave in the first place

In general, the service works by maintaining a lightweight state for each user. On each click of a controller link, the server mutates the user's state, draws a new JPEG output, and pushes it to the user's `<img src="/screen">` stream.

The creation of multiple states (one per user) is accomplished by assigning a unique, third-party `id` cookie to the user's browser on the domain hosting the Tropemon service. When the user first visits the game page, the `<img>` tag instructs the browser to load the `/sceen` endpoint. On first visit, the `/screen` response sets a unique UUID cookie on the service's domain, and this cookie will be sent (and therefore differentiate the user from all others) with every single HTTP request sent to the service.

## Who?

I'm Andrew Sillers, the guy who also hosts [the video game Doom on AO3](https://archiveofourown.org/works/31295183).

If you want to contribute, like, I guess?! The code is absoultely shameful because I coded it in desparate, breakneck sprint in time for April Fools Day 2023.

## Why?

"Tropémon" rhymes with "Pokémon" and I thought it would be funny to have fanfiction tropes fight each other, within a fan work that is itself a parody of Pokemon.