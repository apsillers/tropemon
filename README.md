# Tropemon

## What?

In terms of structure, this is a web application that accepts input as HTTP requests (which are sent by clicking links) and that renders output as SVG images sent on a `multipart/x-mixed-replace` stream supplied to an `<img>` element.

In terms of substance, it is a fanfiction-themed pardoy of the Pokémon video game series.

## How?

The overall approach is documented in my [2021 !!Con talk, Night of the living GIF](https://www.youtube.com/watch?v=GJa6eD7tFbY). Improvements over the approach there are:
  * instead of an infinite GIF, use `x-mixed-replace` to stream a series of JPEGs to a single `<img>`
  * instead of `3xx` redirects to bounce the user back to the page, use `204 No Content` responses to ensure the user doesn't leave in the first place

In general, the service works by maintaining a lightweight state for each user. On each click of a controller link, the server mutates the user's state, builds a new SVG document, and pushes it to the user's `<img src="/screen">` stream.

The creation of multiple states (one per user) is accomplished by assigning a unique, third-party `id` cookie to the user's browser on the domain hosting the Tropemon service. When the user first visits the game page, the `<img>` tag instructs the browser to load the `/sceen` endpoint. On first visit, the `/screen` response sets a unique UUID cookie on the service's domain, and this cookie will be sent (and therefore differentiate the user from all others) with every single HTTP request sent to the service.

## Who?

I'm Andrew Sillers, the guy who also hosts [the video game Doom on AO3](https://archiveofourown.org/works/31295183).

If you want to contribute, I guess you could?! The code is absoultely shameful because I coded it in a desparate, breakneck sprint in time for April Fools Day 2023.

## Why?

"Tropémon" rhymes with "Pokémon" and I thought it would be funny to have fanfiction tropes fight each other, within a fan work that is itself a parody of Pokemon.

## Setup

To run the service, you need to point at a Redis instance (for storing player state) and then run the code.

1. In the top directory, run `npm install` to install dependencies.
2. Identify your Redis instance/credentails by setting the environment variables `REDISUSER`, `REDISPASS`, `REDISHOST`, `REDISPORT` (e.g., by `.env` file or command-line `export` or similar).
3. Similarly set the `PORT` environment variable to set the HTTP port, or use the default of `3000`.
4. Optionally, change the `homeURL` variable in `utils.js` to point to a redirect location.
5. Start the service with `npm start`.
6. Access the service at `http://localhost:3000/` (or whatever hostname and port your expect).

The service is designed to be ruthlessly low-storage, so you can probably get by with a free Redis instance at https://app.redislabs.com if you like. (I personally do.)

## License

This work is licensed under the GNU Affero General Public License, version 3, or (at your option) any other future version of that license published by the Free Software Foundation. Practiaclly, this means:

* you have permission to run a copy of this service yourself, and
* you can host modified versions of this service if you share the source code of your modified service (also under AGPLv3+) with your users.

I think this should be a pretty easy requirement to satisfy (just link to a copy of your code whenever you host a modified service!), but I'm open to different licensing terms, if you have a compelling reason why the AGPLv3+ is particularly onerous for whatever you have in mind. Feel free to open an issue to explain!

The .ttf font files are not my authorship but are freely available under the SIL Open Font License, whose text is contained in `OFL.txt`.

## Disclaimer

I have no affiliation with Nintendo, or the Pokémon Company, or anybody else who owns Pokémon trademarks or copyright. While this is obviously a loving parody, it doesn't contain any actual characters or marks from Pokémon or any other monster-catching games/franchises!
