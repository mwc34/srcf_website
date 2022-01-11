import requests
from html.parser import HTMLParser
import os
import json
import shutil
import random

path = os.path.dirname(os.path.abspath(__file__))

def get_champion_list():
    url = 'https://leagueoflegends.fandom.com/wiki/List_of_champions'
    
    r = requests.get(url)
    
    class MyHTMLParser(HTMLParser):
        active = False
        reported = False
        in_th = False
        data = []
        def handle_starttag(self, tag, a):
            if tag == 'th':
                self.in_th = True
                
            elif tag == 'tr' and self.active:
                self.reported = False
            
            elif tag == 'td' and not self.reported and self.active:
                for i in a:
                    if i[0] == 'data-sort-value':
                        self.data.append([i[1]])
            
            elif tag == 'a' and not self.reported and self.active:
                for i in a:
                    if i[0] == 'href':
                        if self.data:
                            self.data[-1].append(i[1])
                self.reported = True
        
        def handle_endtag(self, tag):
            if tag == 'tbody':
                self.active = False
                
        def handle_data(self, data):
            if self.in_th and 'Champion' == data.strip():
                self.active = True
                self.in_th = False
                
    p = MyHTMLParser()
    
    p.feed(r.text)
    
    return p.data
    
    
def get_champion_info(name, url_suffix):
    url = 'https://leagueoflegends.fandom.com' + url_suffix
    
    r = requests.get(url)
    
    class MyHTMLParser(HTMLParser):
        in_header = False
        in_skill = False
        abilities = []
        def handle_starttag(self, tag, a):
            if tag == 'div':
                for i in a:
                    if i[0] == 'class' and len(self.abilities) < 5 and i[1] == f'skill skill_{["innate", "q", "w", "e", "r"][len(self.abilities)]}':
                        self.in_skill = i[1][len('skill skill_'):]
                        
                    if i[0] == 'class' and i[1] == 'champion-ability__header':
                        if self.in_skill:
                            self.in_header = True
                        
                        else:
                            while len(self.abilities) and len(self.abilities[-1]) == 1:
                                self.abilities.pop()
                    
                
            elif tag == 'img' and self.abilities:
                for i in a:
                    if (i[0] == 'alt' 
                            and (
                                i[1].replace(":", "-").replace(",", "") == f'{name} {self.abilities[-1][0]}.png'.replace(":", "-").replace(",", "")
                                or (self.abilities[-1][0] == 'Spider Form / Human Form' and i[1] == 'Elise Spider Form.png')
                                or (self.abilities[-1][0] == 'Inferno Trigger' and i[1] == 'Samira Rank S.png')
                            ) 
                            and len(self.abilities[-1]) == 1):
                        
                        for j in a:
                            if j[0] == 'data-src':
                                self.abilities[-1].extend([j[1], self.in_skill])
                                self.in_skill = False
                
        def handle_data(self, data):
            if self.in_header and self.in_skill:
                self.abilities.append([data])
                self.in_header = False
    
    p = MyHTMLParser()
    
    p.feed(r.text)
    
    return [i for i in p.abilities if len(i) == 3]
    

def download_image(url, file_path):

    # Open the url image, set stream to True, this will return the stream content.
    r = requests.get(url, stream = True)

    # Check if the image was retrieved successfully
    if r.status_code == 200:
        # Set decode_content value to True, otherwise the downloaded image file's size will be zero.
        r.raw.decode_content = True
        
        # Open a local file with wb ( write binary ) permission.
        with open(file_path, 'wb+') as f:
            shutil.copyfileobj(r.raw, f)
            
    else:
        print('Image Couldn\'t be retreived')
    

def main():
    d = get_champion_list()

    c = []
    used_ids = []

    base_image_folder = 'images'
    base_image_path = os.path.join(path, base_image_folder)
    if not os.path.exists(base_image_path):
        os.makedirs(base_image_path)


    for name, suffix in d:
        if 'Nunu' in name:
            name = 'Nunu'
            
        abilities = get_champion_info(name, suffix)

        if len(abilities) != 5:
            print(name, suffix, abilities)
        else:
            print(name)
        
        c_tmp = []
        
        for a in abilities:
            id = random.randint(0, 2**16-1)
            while id in used_ids:
                id = random.randint(0, 2**16-1)
            
            rel_image_path = os.path.join(base_image_folder, f'{id}.png')
            image_path = os.path.join(path, rel_image_path)
            
            if not os.path.exists(image_path):
                download_image(a[1], image_path)
            
            c_tmp.append({
                'champion' : name,
                'name' : a[0],
                'key' : name + ' ' + a[2].capitalize(),
                'url' : rel_image_path.replace('\\', '/'),
            })
            
        c.append(c_tmp)
        
        
    with open(os.path.join(path, 'abilities.json'), 'w') as fp:
        json.dump(c, fp, indent=4)

d = get_champion_list()
