# END GOALS:

Have a front end app that takes a picture of my product and shipping label or take 2 or more picures: pictures of the product and one of the label.

Have a process that checks which is the label and scans that picture for the TO: name, address, and or phone on the label and maps the metadata with all these pictures to be able to integrate into a database to match to other ecmerce platforms.

have the ablity to integrate with ecomerce platforms first we will start with Etsy but we want to make this modular to be able to integrate with others like Amazon or Ebay if they offer API solutions to integrate.

## Etsy integration Open API v3

Be able to pull in all the orders/buyers/recipants into our database and have their own entries to be able to store mappings to the prduct packts aka the photos we take so we can send pictures to the clients of the product and label for them to see that its being packed and on its way.


## Versions of the app(s)

- Product Fullfillment lite (stand alone phone app for android and ios): will need a database locally as well as the front end to take pictures and map to the integration orders with their contacts and be able to open an email with the product packets photos in an attachment

- Server edition (uses same backend as the phone but the phone will sign in to a server to send all data between them so we can have multiple phone connected and able to see some integrations and databases)

- lite web interface that can interface with the server for people on a pc to be able to look into without their phones

