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
  - [x] `>/channels`
    - [x] `GET` - List or search
    - [x] `>/:id`
      - [x] `GET`
      - [x] `PATCH` - Toggle
      - [x] `DELETE`
      - [ ] `>/users`
        - [ ] `>/:userId`
          - [ ] `>/balance`
      - [ ] `>/quotes`
        - [x] `GET` - List or search
        - [x] `GET` - Random
        - [x] `POST`
        - [x] `>/:quoteId`
          - [x] `GET`
          - [x] `PUT` - Edit content
          - [x] `PATCH` - Toggle
          - [x] `DELETE`
      - [ ] `>/suggestions`
        - [ ] `>/:suggestionId`
      - [ ] `>/loveCounters`
        - [ ] `>/:userId`
      - [ ] `>/commands`
        - [ ] `>/:keyword`
          - [ ] `>/variables`
            - [ ] `>/:varId`
      - [ ] `>/deathCounters`
        - [ ] `>/:gameId`
  - [ ] `>/guilds`
    - [ ] `>/:id`
