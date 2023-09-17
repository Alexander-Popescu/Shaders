precision mediump float;

const float FOV = 1.0;
const int MAX_STEPS = 1000;
const float MAX_DIST = 1000.0;
const float HIT_THRESHOLD = 0.0001;

struct sceneReturn
{
    float x;
    vec3 y;
};

float SDFsphere(vec3 p, vec3 spherePos, float sphereRadius)
{
    return length(p - spherePos) - sphereRadius;
}

float SDFplane(vec3 p, vec3 planePos, vec3 planeNormal)
{
    return dot(p - planePos, planeNormal);
}

float SDFrectangularprism(vec3 p, vec3 prismPos, vec3 prismSize)
{
    vec3 q = abs(p - prismPos) - prismSize;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

sceneReturn scene(vec3 p)
{
    //returns vec2 where vec2.x is the distance and vec2.y is the object
    
    //sphere in center
    vec3 spherePos = vec3(0.0, 0.0, 0.0);
    float sphereRadius = 1.0;
    vec3 sphereId = vec3(1.0,0.0,0.0);
    float sphereDist = SDFsphere(p, spherePos, sphereRadius);

   //plane under it
    vec3 planePos = vec3(0.0, -10.0, 0.0);
    vec3 planeNormal = vec3(0.0, 1.0, 0.0);
    vec3 planeId = vec3(-1.0,-1.0,-1.0);
    float planeDist = SDFplane(p, planePos, planeNormal);

    //cube next to sphere
    vec3 prismPos = vec3(-2.0, 0.0, 0.0);
    vec3 prismSize = vec3(1.0, 2.0, 3.0);
    vec3 prismId = vec3(0.0,0.0,0.0);
    float prismDist = SDFrectangularprism(p, prismPos, prismSize);
    
    //return union
    if (sphereDist < planeDist && sphereDist < prismDist)
    {
        return sceneReturn(sphereDist, sphereId);
    }
    else if (planeDist < prismDist)
    {
        return sceneReturn(planeDist, planeId);
    }
    else
    {
        return sceneReturn(prismDist, prismId);
    }
}

sceneReturn rayMarch(vec3 rayOrigin, vec3 rayDirection)
{
    //returns vec2 where vec2.x is the distance and vec2.y is the object
    sceneReturn result;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        vec3 p = rayOrigin + rayDirection * result.x;
        sceneReturn dist = scene(p);
        result.x += dist.x;
        result.y = dist.y;
        if (dist.x < HIT_THRESHOLD || result.x > MAX_DIST)
        {
            break;
        }
    }
    return result;
}

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(HIT_THRESHOLD, 0.0);
    vec3 normal = vec3(
        scene(p + e.xyy).x - scene(p - e.xyy).x,
        scene(p + e.yxy).x - scene(p - e.yxy).x,
        scene(p + e.yyx).x - scene(p - e.yyx).x);
    return normalize(normal);
}

vec3 getMaterial(vec3 hitPos, vec3 id)
{
    //if no negatives id is color, else its special material
    if (id.x >= 0.0 && id.y >= 0.0 && id.z >= 0.0)
    {
        return id;
    }

    if (id == vec3(-1.0,-1.0,-1.0))//checkerboard
    {
        return vec3(0.2 + 0.4 * mod(floor(hitPos.x) + floor(hitPos.z), 2.0));
    }
    else
    {
        return vec3(1.0, 1.0, 1.0);
    }
}

vec3 light(vec3 hitPos, vec3 rayDirection, vec3 color)
{
    vec3 lightPos = vec3(20.0, 30.0, -30.0);
    vec3 light = normalize(lightPos - hitPos);
    vec3 normal = getNormal(hitPos);
    vec3 view = -rayDirection;
    vec3 reflect = reflect(-light, normal);

    //phong lighting

    vec3 specularColor = vec3(0.5);
    vec3 specular = specularColor * pow(clamp(dot(reflect, view), 0.0, 1.0), 10.0);
    vec3 diffuse = color * clamp(dot(light, normal), 0.0, 1.0);
    vec3 ambient = color * 0.05;

    //shadows
    //value to fix noise on front of objects
    float small_number = 0.01;
    sceneReturn result = rayMarch(hitPos + normal * small_number, light);
    if (result.x < length(lightPos - hitPos))
    {
        return ambient;
    }
    
    return diffuse + ambient + specular;

}

mat3 camera(vec3 rayOrigin, vec3 lookAt)
{
    vec3 camForward = normalize(vec3(lookAt - rayOrigin));
    vec3 camRight = normalize(cross(vec3(0,1,0), camForward));
    vec3 camUp = cross(camForward, camRight);

    return mat3(camRight,camUp,camForward);
}

vec3 render(in vec2 uv, in vec3 rayOrigin, in vec3 rayDirection)
{
    vec3 background_color = vec3(0.6, 0.9, 1.0);
    vec3 color = vec3(0.0);

    //raymarch
    sceneReturn result = rayMarch(rayOrigin, rayDirection);
    if (result.x < MAX_DIST)
    {
        //hit
        vec3 hitPos = rayOrigin + rayDirection * result.x;
        vec3 material = getMaterial(hitPos, result.y);
        color += light(hitPos, rayDirection, material);

        //add fog effect
        color = mix(color, background_color, 1.0 - exp(-0.0008 * result.x * result.x));
    }
    else
    {
        color += background_color - max(0.95 * rayDirection.y, 0.0);
    }

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    //normalize coordinate system so that 0,0 is in the center of the screen
    vec2 uv = (2.0 * fragCoord.xy - iResolution.xy) / iResolution.y;
    
    //color for this pixel
    vec3 color = vec3(1.0);

    //calculate ray for the camera to this pixel
    vec3 rayOrigin = vec3(sin(iTime * 0.4) * 10.0, 1.0, cos(iTime * 0.15) * 10.0);
    vec3 lookAtPosition = vec3(0.0,0.0, 0.0);
    vec3 rayDirection = camera(rayOrigin, lookAtPosition) * normalize(vec3(uv, FOV));

    color = render(uv, rayOrigin, rayDirection);

    //post processing
    
    //gamma correction
    color = pow(color, vec3(0.4545));

    //send it out
    fragColor = vec4(color, 1.0);
}