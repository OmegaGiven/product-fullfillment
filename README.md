# END GOALS:

Have a front end app that takes a picture of my product and shipping label or take 2 or more picures: pictures of the product and one of the label.

Have a process that checks which is the label and scans that picture for the TO: name, address, and or phone on the label and maps the metadata with all these pictures to be able to integrate into a database to match to other ecmerce platforms.

we want this app to be able to work solely on a phone where it matches orders from integrations like etsy and squarespace and then once matched with the order contact be able to send a message (that can be automated but at least needs human approval) once the pictures are checed and confirmed.

have the ablity to integrate with ecomerce platforms first we will start with Etsy but we want to make this modular to be able to integrate with others like Amazon or Ebay if they offer API solutions to integrate.

## Etsy integration Open API v3

Be able to pull in all the orders/buyers/recipants into our database and have their own entries to be able to store mappings to the prduct packts aka the photos we take so we can send pictures to the clients of the product and label for them to see that its being packed and on its way.

## Square space integration

same as etsy need api pulling from that.

## Versions of the app(s)

- Product Fullfillment lite (stand alone phone app for android and ios): will need a database locally as well as the front end to take pictures and map to the integration orders with their contacts and be able to open an email with the product packets photos in an attachment

- Server edition (uses same backend as the phone but the phone will sign in to a server to send all data between them so we can have multiple phone connected and able to see some integrations and databases)

- lite web interface that can interface with the server for people on a pc to be able to look into without their phones

# APP Workflow
we want this workflow to be modular so admin can alter the flow to how they want to make it easier for themselves.

1. click start new product fullfillment
2. take pictures of your product (and label)
3. preview pictures and confirm.
4. front end: show buffer. backend: launch process to map the product label to an order in the integrations that are integrated.
5. have screen confirm the matched order belongs to that label
6. preview a template email to be sent with the pictures attatched, have the customer name and or other details an admin can setup in their templates
7. Confirm and send email.

# Dev Startup

Primary startup command from repo root:

```bash
npm run dev -- web
```

Other modes:

```bash
npm run dev -- native
npm run dev -- ios
npm run dev -- android
```

Static web export:

```bash
bash ./scripts/build-web-preview.sh
```

Notes:

- Web uses a browser-safe local storage fallback instead of native SQLite.
- Native iOS and Android continue to use `expo-sqlite`.
