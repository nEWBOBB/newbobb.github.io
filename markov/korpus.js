// Trainingstexte für den Markov-Generator. Alle Texte sind eigens für diese Seite geschrieben.

window.KORPUS = {
	mini: [
		"Der Hund jagt die Katze. Die Katze jagt die Maus. Der Hund schläft. Die Maus schläft im Haus.",
		"Heute scheint die Sonne. Morgen regnet es. Heute regnet es nicht. Morgen scheint die Sonne wieder.",
	],

	maerchen: `Es war einmal ein alter König, der hatte drei Töchter. Die jüngste Tochter war die schönste von allen, und der König liebte sie mehr als sein ganzes Reich. Hinter dem Schloss lag ein großer, dunkler Wald, und in dem Wald stand ein alter Brunnen. Wenn es heiß war, ging die jüngste Tochter in den Wald und setzte sich an den Brunnen.

Eines Tages fiel ihr goldener Ball in den Brunnen. Da fing sie an zu weinen und weinte immer lauter. Da sprach eine Stimme aus dem Brunnen: Was weinst du, schöne Tochter des Königs? Sie sah sich um und erblickte einen Frosch, der seinen dicken Kopf aus dem Wasser streckte. Ich weine über meinen goldenen Ball, der in den Brunnen gefallen ist, sprach sie.

Es war einmal ein armer Müller, der hatte drei Söhne. Der älteste Sohn bekam die Mühle, der zweite Sohn bekam den Esel, und der jüngste Sohn bekam nur einen Kater. Da wurde der jüngste Sohn traurig und sprach: Was soll ich mit einem Kater? Der Kater aber sprach: Sei nicht traurig, gib mir ein Paar Stiefel, und ich mache dich reich.

Es war einmal ein kleines Mädchen, das ging jeden Tag in den Wald zu seiner Großmutter. Die Großmutter wohnte draußen im Wald, eine halbe Stunde vom Dorf. Als das Mädchen in den Wald kam, begegnete ihm der Wolf. Das Mädchen wusste aber nicht, was der Wolf für ein böses Tier war, und fürchtete sich nicht vor ihm. Guten Tag, sprach der Wolf. Schönen Dank, Wolf, sprach das Mädchen.

Der König aber wurde zornig und sprach: Was du versprochen hast, das musst du auch halten. Da ging die Tochter in den Wald zurück und holte den Frosch. Der Frosch saß am Tisch und aß von ihrem goldenen Teller. Am Abend sprach der Frosch: Ich bin müde, trag mich in dein Zimmer. Da fing die Tochter wieder an zu weinen.

Der Kater zog die Stiefel an und ging in den Wald. Dort fing er einen großen Hasen und brachte ihn zum König. Der König freute sich über den Hasen und gab dem Kater so viel Gold, wie er tragen konnte. Der Kater brachte das Gold dem jüngsten Sohn, und der jüngste Sohn wurde reich.

Der Wolf aber lief geradewegs zum Haus der Großmutter und klopfte an die Tür. Wer ist draußen? fragte die Großmutter. Das Mädchen, sprach der Wolf, mach auf. Da ging die Tür auf, und der Wolf trat ins Haus. Als das Mädchen ankam, wunderte es sich, dass die Tür offen stand. Großmutter, was hast du für große Ohren? Dass ich dich besser hören kann. Großmutter, was hast du für große Augen? Dass ich dich besser sehen kann.

Und so lebten der König und seine Tochter, der Müllersohn und sein Kater und das Mädchen mit der Großmutter noch viele Jahre glücklich in dem großen Reich. Und wenn sie nicht gestorben sind, dann leben sie noch heute.`,

	wetter: `Am Montag ist es im Norden meist bewölkt, und es fällt zeitweise Regen. Im Süden scheint dagegen häufig die Sonne. Die Temperaturen steigen auf zwölf bis achtzehn Grad. Der Wind weht schwach bis mäßig aus Südwest.

Am Dienstag zieht von Westen ein Regengebiet heran. Im Westen und im Norden regnet es zeitweise kräftig, im Süden bleibt es noch länger trocken. Die Temperaturen erreichen zehn bis sechzehn Grad. Der Wind weht mäßig, an der Küste frisch aus Südwest, in Böen stürmisch.

Am Mittwoch ist es wechselnd bewölkt mit Schauern, im Bergland auch mit Gewittern. Zwischen den Schauern scheint auch mal die Sonne. Die Temperaturen steigen auf neun bis fünfzehn Grad. Der Wind weht mäßig bis frisch aus West.

Am Donnerstag setzt sich Hochdruckeinfluss durch. Nach Auflösung von Nebel scheint verbreitet die Sonne, nur im Norden ziehen einige Wolken durch. Die Temperaturen steigen auf vierzehn bis zwanzig Grad. Der Wind weht schwach aus Ost.

Am Freitag scheint im ganzen Land häufig die Sonne. Es bleibt trocken. Die Temperaturen erreichen achtzehn bis vierundzwanzig Grad, am Oberrhein bis sechsundzwanzig Grad. Der Wind weht schwach aus Südost.

In der Nacht zum Samstag ist es meist klar, im Süden bildet sich gebietsweise Nebel. Die Tiefstwerte liegen zwischen fünf und elf Grad. Am Samstag ist es im Süden sonnig und warm, im Norden ziehen dichtere Wolken auf, und es fällt gebietsweise Regen. Die Temperaturen steigen auf sechzehn bis dreiundzwanzig Grad.

Am Sonntag regnet es im Norden zeitweise, im Süden gibt es am Nachmittag einzelne Schauer und Gewitter. Die Temperaturen erreichen fünfzehn bis einundzwanzig Grad. Der Wind weht mäßig aus West, bei Gewittern mit stürmischen Böen.

Die weiteren Aussichten: Zu Beginn der neuen Woche ist es wechselhaft mit Wolken, Sonne und einzelnen Schauern. Die Temperaturen liegen bei zwölf bis neunzehn Grad. Im Bergland ist es kühler, an der Küste weht ein frischer Wind aus Nordwest.`,

	rezept: `Für den Teig das Mehl in eine Schüssel geben und mit dem Salz vermischen. Die Butter in kleine Stücke schneiden und mit den Händen in das Mehl einarbeiten, bis es krümelig ist. Dann das Ei und etwas kaltes Wasser dazugeben und alles zu einem glatten Teig verkneten. Den Teig in Folie wickeln und eine halbe Stunde im Kühlschrank ruhen lassen.

Für die Füllung die Zwiebeln schälen und in feine Würfel schneiden. Etwas Öl in einer Pfanne erhitzen und die Zwiebeln darin glasig dünsten. Den Lauch putzen, waschen und in feine Ringe schneiden. Den Lauch zu den Zwiebeln geben und kurz mitdünsten. Mit Salz und Pfeffer würzen und etwas abkühlen lassen.

Den Backofen auf zweihundert Grad vorheizen. Eine Form mit Butter einfetten. Den Teig auf einer bemehlten Fläche dünn ausrollen und in die Form legen. Den Rand gut andrücken. Den Boden mehrmals mit einer Gabel einstechen.

Die Eier mit der Sahne in einer Schüssel verquirlen. Den Käse reiben und unter die Eier rühren. Mit Salz, Pfeffer und etwas Muskat würzen. Die Füllung auf dem Teig verteilen und die Eiermischung darübergießen. Im heißen Ofen etwa vierzig Minuten backen, bis die Oberfläche goldbraun ist.

Für die Suppe die Kartoffeln schälen, waschen und in kleine Würfel schneiden. Die Möhren schälen und in Scheiben schneiden. Etwas Butter in einem Topf erhitzen und die Zwiebeln darin glasig dünsten. Die Kartoffeln und die Möhren dazugeben und kurz mitdünsten. Mit der Brühe ablöschen und alles etwa zwanzig Minuten köcheln lassen, bis die Kartoffeln weich sind.

Die Suppe mit einem Stabmixer fein pürieren. Die Sahne dazugeben und noch einmal kurz aufkochen lassen. Mit Salz, Pfeffer und etwas Muskat abschmecken. Die Petersilie waschen, fein hacken und über die Suppe streuen.

Für den Kuchen die Butter mit dem Zucker schaumig rühren. Die Eier nach und nach dazugeben und gut unterrühren. Das Mehl mit dem Backpulver mischen und abwechselnd mit der Milch unter den Teig rühren. Die Äpfel schälen, in Spalten schneiden und auf dem Teig verteilen. Im heißen Ofen etwa fünfzig Minuten backen. Den Kuchen in der Form abkühlen lassen und mit Puderzucker bestreuen.`,
};
