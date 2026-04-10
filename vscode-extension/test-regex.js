const str = '{% capture fullName %}{{ content.user.firstName | Strip }} {{ content.user.lastName | Strip }}{% endcapture %}\n';
const regex = /(\{\{.*?\}\}|\{%-?[\s\S]*?-?%\}|[^{]+|\{(?!\{|%))/g;

const matches = [];
let match;
while ((match = regex.exec(str)) !== null) {
    if (match[0]) matches.push(match[0]);
}

console.log(matches);
