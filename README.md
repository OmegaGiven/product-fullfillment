# END GOALS:

Have an app that takes picture(s) of a product and shipping label: pictures of the product and one of the label sometimes label can be in product picture.

Have a process that checks which is the label and scans that picture for the TO: name, address, and or phone (if there) on the label and maps the data with all these pictures to be able to integrate into a database to match to ecomerce platform's orders and products.

we want this app to be able to work solely on a phone where it matches orders from integrations like square space and etsy and then once matched with the order contact be able to send a message (that can be automated but at least needs human approval) once the pictures are checed and confirmed.

have the ablity to integrate with ecomerce platforms first we will start with Etsy but we want to make this modular to be able to integrate with others like Amazon or Ebay or squarespace if they offer API solutions to integrate.

## Square space integration

pull order data into db to log the order label data, product data, price of order etc.

## Etsy integration Open API v3

Be able to pull in all the orders/buyers/recipants into our database and have their own entries to be able to store mappings to the prduct packts aka the photos we take so we can send pictures to the clients of the product and label for them to see that its being packed and on its way.


## Versions of the app(s)

- Product Fullfillment mobile (stand alone phone app for android and ios): app will need to contain the DB as well as the app visuals to take pictures and map to the integration orders with their contacts and be able to open an email with the product packets photos in an attachment and send. have settings menu to adjust configurations of future things we will add to this app.

- Product Fullfillment web capture mode: the web app should also be able to use a computer's built in webcam or any connected USB camera to take product and label pictures and run OCR on those pictures so this workflow can work on desktops and laptops too.

- Server edition: the product fullfillment mobile app will be able to link to a server where it stores all the photos as well as all the integration pulled data from ecomerce platforms. the server will take on the role of matching as integration data comes in and photos from product fullfillment comes in.

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


## features:

- add a import integration ablity for other integrations designs to be added if not already added.
- add a fullfillment workflow engine where an admin of their business org can adjust the fullfillment workflow and add new modules and remove old ones as needed for their business needs.
- add table views to view orders not fullfilled pulled in by the various integrations (each order should also have a column in the table for what it belongs to)
- add browser camera selection and browser OCR support so the app can work with webcams and external cameras connected to a pc or laptop


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
