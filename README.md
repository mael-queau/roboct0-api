# RobOct0

## Roadmap

- [x] OAuth2
  - [x] Discord registration
    - [x] Redirect to OAuth2 link
  - [x] Twitch registration
    - [x] Redirect to OAuth2 link
    - [x] Periodic verification of tokens
    - [x] Refreshing of invalid tokens
    - [x] Disabling of unrefreshable tokens
- [ ] API
  - [x] `/channels`
    - [x] `GET` - Get multiple or search for channels
    - [x] `/channels/:id`
      - [x] `GET` - Get single
      - [x] `PATCH` - Toggle
      - [x] `DELETE` - Completely remove
      - [x] `/channels/:id/guilds`
        - [x] `GET` - Only returns a count
        - [x] `POST` - Add the channel to a guild
        - [x] `DELETE` - Remove the channel from a guild
      - [ ] `/channels/:id/users`
        - [ ] `/channels/:id/users/:userId`
          - [ ] `/channels/:id/users/:userId/balance`
      - [ ] `/channels/:id/quotes`
        - [ ] `/channels/:id/quotes/:quoteId`
      - [ ] `/channels/:id/suggestions`
        - [ ] `/channels/:id/suggestions/:suggestionId`
      - [ ] `/channels/:id/loveCounters`
        - [ ] `/channels/:id/loveCounters/:userId`
      - [ ] `/channels/:id/commands`
        - [ ] `/channels/:id/commands/:keyword`
          - [ ] `/channels/:id/commands/:keyword/variables`
            - [ ] `/channels/:id/commands/:keyword/variables/:varId`
      - [ ] `/channels/:id/deathCounters`
        - [ ] `/channels/:id/deathCounters/:gameId`
