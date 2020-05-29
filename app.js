//jshint esversion:6

//Permite a utilização do Express - Framework Nodejs
const express = require("express");
//Permite a utilização do Body Parser - Coleta dados enviados de formulários
const bodyParser = require("body-parser");
//Permite utilizar o Mongoose - BD
const mongoose = require("mongoose");
//Permite utilizar o Lodash - Biblioteca de arrays
const _ = require("lodash");

//Manipulador
const app = express();

//Ativa a utilização dos templates em EJS
app.set('view engine', 'ejs');

//Ativa o body-parser
app.use(bodyParser.urlencoded({ extended: true }));

//Itens utilizados na pasta public agora são visíveis ao EJS
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", { useNewUrlParser: true });

//Cria o desenho da coleção (tabela)
const itemsSchema = {
    name: String
};

//Cria a coleção (tabela), utilizando o desenho. Em model: Nome no singular + Desenho
const Item = mongoose.model("Item", itemsSchema);

//Itens default
const item1 = new Item({
    name: "Welcome to your todolist!"
});
const item2 = new Item({
    name: "Hit the + button to add a new item."
});
const item3 = new Item({
    name: "<-- Hit this to delete an item."
});

//Inserindo os itens num array para utilizar a insertMany()
const defaultItems = [item1, item2, item3];

//Criação do desenho da coleção Lista
const listSchema = {
    name: String,
    items: [itemsSchema]
};

//Cria a coleção (tabela), utilizando o desenho. Em model: Nome no singular + Desenho
const List = mongoose.model("List", listSchema);

//Ao entrar no site...
app.get("/", function(req, res) {

    //Pesquisar por todos os itens da lista
    Item.find({}, function(err, foundItems) {

        //Se não tiver nenhum item...
        if (foundItems.length === 0) {
            //Insira os itens default no BD
            Item.insertMany(defaultItems, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Successfully savevd default items to DB.");
                }
            });
            //Resetar a página
            res.redirect("/");
        } else {
            //Se não, apenas abra a coleção e mostre os itens
            res.render("list", { listTitle: "Today", newListItems: foundItems });
        }
    });
});

//Ao criar uma nova lista, através da URL...
app.get("/:customListName", function(req, res) {
    //pega o nome da nova coleção através da URL, adequando-a com o lodash
    const customListName = _.capitalize(req.params.customListName);

    //Pesquisa se existe uma coleção com o mesmo nome
    List.findOne({ name: customListName }, function(err, foundList) {
        if (!err) {
            //Se não encontrou uma lista com nome similar
            if (!foundList) {
                //Cria nova lista
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });
                //Salva a lista
                list.save();
                //
                res.redirect("/" + customListName);
            } else {
                //Show an existing list
                res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
            }
        }
    });
});

//Quando há post do formulário
app.post("/", function(req, res) {

    //Pega o item
    const itemName = req.body.newItem;
    //Pega o nome da lista
    const listName = req.body.list;

    //Cria o item 
    const item = new Item({
        name: itemName
    });

    //Se a lista for a inicial, salva e redireciona pra ela mesma
    if (listName === "Today") {
        item.save();
        res.redirect("/");
    } else { //Se não, procura pela/cria a coleção e adiciona o item lá
        List.findOne({ name: listName }, function(err, foundList) {
            foundList.items.push(item);
            foundList.save();
            //Redireciona para a mesma página
            res.redirect("/" + listName);
        });
    }
});

//Ao clicar num checkbox...
app.post("/delete", function(req, res) {

    //Recebe o id do item
    const checkedItemId = req.body.checkbox;
    //Recebe o nome da coleção
    const listName = req.body.listName;

    //Se for a coleção principal
    if (listName === "Today") {
        Item.findByIdAndRemove(checkedItemId, function(err) {
            if (!err) {
                console.log("Successfully deleted checked item.");
                res.redirect("/");
            }
        });
    } else { //Caso seja outra coleção
        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } }, function(err, foundList) {
            if (!err) {
                res.redirect("/" + listName);
            }
        });
    }
});

//Carrega a página About
app.get("/about", function(req, res) {
    res.render("about");
});

//Inicia o servidor
app.listen(3000, function() {
    console.log("Server started on port 3000");
});